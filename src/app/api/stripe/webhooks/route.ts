
import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe requires the raw body to construct the event, so we disable Next.js's body parser.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

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
 * Handles subscription creation, update, or deletion events from Stripe and updates the corresponding user document in Firestore.
 * This single function handles all relevant subscription statuses.
 * @param subscription - The Stripe subscription object.
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;
    const userDocRef = await findUserByStripeCustomerId(stripeCustomerId);

    if (!userDocRef) {
        console.warn(`No user found for Stripe customer ID: ${stripeCustomerId}. Skipping update.`);
        return;
    }
    
    let status = subscription.status;
    if (subscription.cancel_at_period_end) {
        status = 'canceled';
    }

    const subscriptionData = {
        subscriptionId: subscription.id,
        subscriptionStatus: status,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
    
    await userDocRef.update(subscriptionData);
    console.log(`Successfully synced subscription for user ${userDocRef.id}. New status: ${status}`);
}

async function buffer(readable: NodeJS.ReadableStream) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}


export async function POST(req: Request) {
    const buf = await buffer(req.body as unknown as NodeJS.ReadableStream);
    const sig = headers().get('stripe-signature');

    if (!webhookSecret) {
        console.error('Stripe webhook secret is not set.');
        return new NextResponse('Webhook secret not configured.', { status: 500 });
    }
    if (!sig) {
        console.error('Missing stripe-signature header.');
        return new NextResponse('Missing stripe-signature header.', { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
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
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error: any) {
        console.error(`Webhook handler failed for event type ${event.type}. Error: ${error.message}`);
        return new NextResponse('Webhook handler failed.', { status: 500 });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
