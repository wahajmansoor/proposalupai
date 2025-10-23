
'use server';

import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function findUserByStripeCustomerId(stripeCustomerId: string) {
    const userQuery = await adminDb.collection('users').where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
    if (!userQuery.empty) {
        return userQuery.docs[0];
    }
    return null;
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;

    // First, try to find user via metadata if it exists
    let firebaseUID = subscription.metadata?.firebaseUID;
    
    // If not in metadata, try to find user by stripeCustomerId in DB
    const userDocSnapshot = await findUserByStripeCustomerId(stripeCustomerId);

    if (!userDocSnapshot) {
        console.warn(`Webhook Warning: No user found with Stripe customer ID ${stripeCustomerId}. Cannot sync subscription.`);
        return;
    }
    
    firebaseUID = userDocSnapshot.id;
    const userDocRef = userDocSnapshot.ref;

    let newStatus = subscription.status;
    if (subscription.cancel_at_period_end) {
        newStatus = 'canceled';
    }

    const price = subscription.items.data[0]?.price;
    const newInterval = price?.recurring?.interval as 'month' | 'year' | undefined;

    const subscriptionData: { [key: string]: any } = {
        subscriptionId: subscription.id,
        subscriptionStatus: newStatus,
        subscriptionInterval: newInterval || null,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: FieldValue.serverTimestamp(),
    };
    
    await userDocRef.update(subscriptionData);
    console.log(`Successfully synced subscription for user ${firebaseUID}. New status: ${newStatus}, Interval: ${newInterval}`);
}


export async function POST(req: Request) {
    const body = await req.text();
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
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
                         expand: ['items.data.price'],
                    });
                    await handleSubscriptionChange(subscription);
                }
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.created': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const userDoc = await findUserByStripeCustomerId(subscription.customer as string);
                if (userDoc) {
                    await userDoc.ref.update({
                        subscriptionStatus: 'canceled',
                        subscriptionInterval: null,
                    });
                    console.log(`Marked subscription as canceled for user ${userDoc.id}.`);
                }
                break;
            }
            default:
                // Unhandled event type
                // console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error: any) {
        console.error(`Webhook handler failed for event type ${event.type}. Error: ${error.message}`);
        return new NextResponse('Webhook handler failed.', { status: 500 });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
