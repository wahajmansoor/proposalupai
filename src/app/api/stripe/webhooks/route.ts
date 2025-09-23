
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Finds a user in Firestore by their Stripe customer ID.
 * @param stripeCustomerId - The Stripe customer ID.
 * @returns The user's document reference or null if not found.
 */
async function findUserByStripeCustomerId(stripeCustomerId: string) {
    if (!stripeCustomerId) {
        console.warn(`Webhook Warning: Stripe customer ID is missing.`);
        return null;
    }
    const userQuery = await adminDb.collection('users').where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
    if (userQuery.empty) {
        console.warn(`Webhook Warning: No user found with Stripe customer ID ${stripeCustomerId}`);
        return null;
    }
    return userQuery.docs[0].ref;
}


/**
 * Handles subscription creation or update events from Stripe and updates the corresponding user document in Firestore.
 * @param subscription - The Stripe subscription object.
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;
    const userDocRef = await findUserByStripeCustomerId(stripeCustomerId);

    if (!userDocRef) return;

    const subscriptionData = {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
    
    await userDocRef.update(subscriptionData);
    console.log(`Successfully updated subscription for user ${userDocRef.id}. Status: ${subscription.status}`);
}

/**
 * Handles subscription deletion events from Stripe.
 * @param subscription - The Stripe subscription object (can be partial).
 */
async function handleSubscriptionDeletion(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;
    const userDocRef = await findUserByStripeCustomerId(stripeCustomerId);
    
    if (!userDocRef) return;

    // When a subscription is deleted, we only update the status.
    const subscriptionData = {
        subscriptionStatus: subscription.status, // e.g., 'canceled'
    };
    
    await userDocRef.update(subscriptionData);
    console.log(`Successfully updated subscription for user ${userDocRef.id}. Status: ${subscription.status}`);
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
                const updatedSubscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(updatedSubscription);
                break;
            
            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeletion(deletedSubscription);
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
