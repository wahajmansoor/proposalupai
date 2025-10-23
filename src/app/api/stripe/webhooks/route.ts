
'use server';

import { stripe } from '@/lib/stripe/config';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { handleNewTrial, handlePlanActivation, handlePlanUpgrade } from '@/lib/firebase/credits';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Finds a user in Firestore by their Stripe customer ID.
 * @param db - The Firestore admin instance.
 * @param stripeCustomerId - The Stripe customer ID.
 * @returns The user's document snapshot or null if not found.
 */
async function findUserByStripeCustomerId(db: Firestore, stripeCustomerId: string) {
    if (!stripeCustomerId) {
        console.warn(`Webhook Warning: Stripe customer ID is missing.`);
        return null;
    }
    const userQuery = await db.collection('users').where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
    if (userQuery.empty) {
        console.warn(`Webhook Warning: No user found with Stripe customer ID ${stripeCustomerId}`);
        return null;
    }
    return userQuery.docs[0];
}


/**
 * Handles subscription creation or update events from Stripe and updates the corresponding user document in Firestore.
 * @param db - The Firestore admin instance.
 * @param subscription - The Stripe subscription object.
 * @param isUpgradingToYearly - A flag to indicate if the user is upgrading from monthly to yearly.
 */
async function handleSubscriptionChange(db: Firestore, subscription: Stripe.Subscription, isUpgradingToYearly = false) {
    const stripeCustomerId = subscription.customer as string;
    const userDocSnapshot = await findUserByStripeCustomerId(db, stripeCustomerId);

    if (!userDocSnapshot) {
        console.warn(`No user found for Stripe customer ID: ${stripeCustomerId}. Skipping update.`);
        return;
    }
    
    const userDocRef = userDocSnapshot.ref;
    const userData = userDocSnapshot.data();
    
    let newStatus = subscription.status;
    if (subscription.cancel_at_period_end) {
        newStatus = 'canceled';
    }

    const price = subscription.items.data[0]?.price;
    const newInterval = price?.recurring?.interval as 'month' | 'year' | undefined;
    const previousStatus = userData?.subscriptionStatus;
    
    const subscriptionData: { [key: string]: any } = {
        subscriptionId: subscription.id,
        subscriptionStatus: newStatus,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (newInterval) {
        subscriptionData.subscriptionInterval = newInterval;
    }
    
    if (price?.unit_amount) {
        subscriptionData.lastPrice = price.unit_amount / 100;
    }

    // Scenario: A new trial is starting
    const isNewTrial = newStatus === 'trialing' && previousStatus !== 'trialing';
    if (isNewTrial) {
        const trialCreditsPayload = await handleNewTrial(db, userDocRef.id, userData);
        Object.assign(subscriptionData, trialCreditsPayload);
    }
    
    // Scenario: A subscription is becoming active for the first time (from trial or direct purchase)
    const isBecomingActive = newStatus === 'active' && previousStatus !== 'active';
    if (isBecomingActive) {
        const activationCreditsPayload = await handlePlanActivation(db, userDocRef.id, userData, newInterval);
        Object.assign(subscriptionData, activationCreditsPayload);
    }

    // Scenario: An existing monthly subscriber upgrades to yearly
    if (isUpgradingToYearly && !userData?.upgradeBonusGiven) {
        const upgradeCreditsPayload = await handlePlanUpgrade(db, userDocRef.id, userData);
        Object.assign(subscriptionData, upgradeCreditsPayload);
    }

    await userDocRef.update(subscriptionData);
    console.log(`Successfully synced subscription for user ${userDocRef.id}. New status: ${newStatus}, Interval: ${newInterval}`);
}


export async function POST(req: Request) {
    const { adminDb } = await getFirebaseAdmin();
    if (!adminDb) {
        console.error("Firebase Admin not initialized. Cannot process Stripe webhook.");
        return new NextResponse('Server is not configured for Firebase Admin. Webhook processing failed.', { status: 500 });
    }

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
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription' && session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
                        expand: ['items.data.price'],
                    });
                    await handleSubscriptionChange(adminDb, subscription);
                }
                break;
            
            case 'customer.subscription.created':
                const subscriptionCreated = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(adminDb, subscriptionCreated);
                break;

            case 'customer.subscription.updated': {
                const subscriptionUpdated = event.data.object as Stripe.Subscription;
                
                const oldInterval = event.data.previous_attributes?.items?.data?.[0]?.price?.recurring?.interval;
                const newInterval = subscriptionUpdated.items.data[0].price?.recurring?.interval;
                
                const isUpgradingToYearly = oldInterval === 'month' && newInterval === 'year';

                await handleSubscriptionChange(adminDb, subscriptionUpdated, isUpgradingToYearly);
                break;
            }
                  
            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId = deletedSubscription.customer as string;
                const userDoc = await findUserByStripeCustomerId(adminDb, stripeCustomerId);

                if (userDoc) {
                    await userDoc.ref.update({
                        subscriptionStatus: 'canceled',
                        subscriptionInterval: null, 
                        upgradeBonusGiven: FieldValue.delete(), 
                    });
                     console.log(`Successfully marked subscription as canceled for user ${userDoc.id}.`);
                }
                break;

            case 'coupon.created':
            case 'coupon.deleted':
            case 'coupon.updated':
                revalidatePath('/admin-portal/coupons');
                console.log(`Coupon event received: ${event.type}`);
                break;
            
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
