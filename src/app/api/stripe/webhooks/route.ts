
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Handles subscription change events from Stripe and updates the corresponding user document in Firestore.
 * @param subscription - The Stripe subscription object.
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;
    const userQuery = await adminDb.collection('users').where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();

    if (userQuery.empty) {
        // Not returning an error to Stripe because the user might have been deleted,
        // but we can't find a record to update.
        console.warn(`Webhook Warning: No user found with Stripe customer ID ${stripeCustomerId}`);
        return;
    }

    const userDocRef = userQuery.docs[0].ref;
    const userId = userDocRef.id;

    const subscriptionData = {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
    
    await userDocRef.update(subscriptionData);
    console.log(`Successfully updated subscription for user ${userId}. Status: ${subscription.status}`);
}

export async function POST(req: Request) {
    const buf = await req.text();
    const sig = headers().get('stripe-signature');

    if (!webhookSecret) {
        console.error('Stripe webhook secret is not set.');
        return new Response('Webhook secret not configured.', { status: 500 });
    }
    if (!sig) {
        console.error('Missing stripe-signature header.');
        return new Response('Missing stripe-signature header.', { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
                    await handleSubscriptionChange(subscription);
                }
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription);
                break;
            
            default:
                // Unhandled event type
        }
    } catch (error: any) {
        console.error(`Webhook handler failed for event type ${event.type}. Error: ${error.message}`);
        return new Response('Webhook handler failed.', { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
}
