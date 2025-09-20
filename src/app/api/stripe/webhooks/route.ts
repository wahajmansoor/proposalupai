
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function handleSubscriptionEvent(subscription: Stripe.Subscription, eventType: string) {
    const stripeCustomerId = subscription.customer as string;
    const userQuery = await adminDb.collection('users').where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();

    if (userQuery.empty) {
        console.error(`Webhook Error: No user found with Stripe customer ID ${stripeCustomerId}`);
        return;
    }
    const userDocRef = userQuery.docs[0].ref;

    const subscriptionData = {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    await userDocRef.update(subscriptionData);
    console.log(`Updated subscription for user ${userDocRef.id}, Event: ${eventType}`);
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
                if (!session.customer || !session.subscription) {
                    throw new Error('Missing customer or subscription in checkout session.');
                }
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                
                const userQuery = await adminDb.collection('users').where('email', '==', session.customer_details?.email).limit(1).get();
                if (userQuery.empty) {
                    throw new Error(`User not found for email: ${session.customer_details?.email}`);
                }
                const userDocRef = userQuery.docs[0].ref;
                
                await userDocRef.update({
                    stripeCustomerId: customerId,
                    subscriptionId: subscription.id,
                    subscriptionStatus: subscription.status,
                    subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                });
                break;

            case 'invoice.payment_succeeded':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
            case 'customer.subscription.resumed':
                const subscriptionEvent = event.data.object as Stripe.Subscription;
                await handleSubscriptionEvent(subscriptionEvent, event.type);
                break;
            
            default:
                // console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error: any) {
        console.error(`Webhook handler failed. Event: ${event.type}. Error: ${error.message}`);
        return new Response('Webhook handler failed.', { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
}
