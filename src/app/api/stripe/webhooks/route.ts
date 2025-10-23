
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
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
 * Handles the completion of a checkout session. This is the primary event for new subscriptions.
 * It handles credit allocation for new trials.
 * @param db - The Firestore admin instance.
 * @param session - The Stripe checkout session object.
 */
async function handleCheckoutCompleted(db: Firestore, session: Stripe.Checkout.Session) {
    const stripeCustomerId = session.customer as string;
    const userDocSnapshot = await findUserByStripeCustomerId(db, stripeCustomerId);

    if (!userDocSnapshot) {
        console.warn(`No user found for Stripe customer ID: ${stripeCustomerId} in checkout.session.completed. Skipping credit allocation.`);
        return;
    }

    const userDocRef = userDocSnapshot.ref;
    const userData = userDocSnapshot.data();
    const subscriptionId = session.subscription as string;

    if (!subscriptionId) {
        console.warn(`No subscription ID found in checkout session ${session.id}.`);
        return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
    const newInterval = subscription.items.data[0]?.price?.recurring?.interval as 'month' | 'year' | undefined;
    const newStatus = subscription.status;
    
    let creditsPayload = {};

    // Scenario: This is a brand new subscription starting a trial.
    const isNewTrial = newStatus === 'trialing';
    if (isNewTrial) {
        Object.assign(creditsPayload, await handleNewTrial(db, userDocRef.id, userData));
    }

    const subscriptionData: { [key: string]: any } = {
        subscriptionId: subscription.id,
        subscriptionStatus: newStatus,
        subscriptionInterval: newInterval,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        lastPrice: subscription.items.data[0]?.price?.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : null,
        updatedAt: FieldValue.serverTimestamp(),
        ...creditsPayload, // Combine subscription data with trial credits
    };

    await userDocRef.update(subscriptionData);
    console.log(`Successfully processed new subscription from checkout for user ${userDocRef.id}. Status: ${newStatus}`);
}


/**
 * Handles subscription creation or update events from Stripe and updates the corresponding user document in Firestore.
 * This is for ongoing changes like upgrades, downgrades, or post-trial activations.
 * @param db - The Firestore admin instance.
 * @param subscription - The Stripe subscription object.
 */
async function handleSubscriptionChange(db: Firestore, subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;
    const userDocSnapshot = await findUserByStripeCustomerId(db, stripeCustomerId);

    if (!userDocSnapshot) {
        console.warn(`No user found for Stripe customer ID: ${stripeCustomerId}. Skipping update.`);
        return;
    }
    
    const userDocRef = userDocSnapshot.ref;
    const userData = userDocSnapshot.data();
    
    let newStatus = subscription.status;
    // Stripe sends 'active' for subscriptions that are set to cancel at period end.
    // We want to reflect 'canceled' in our DB immediately.
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

    // Scenario: A trial subscription becomes active after the trial period
    const isBecomingActiveFromTrial = newStatus === 'active' && previousStatus === 'trialing';
    if (isBecomingActiveFromTrial) {
        const activationCreditsPayload = await handlePlanActivation(db, userDocRef.id, userData, newInterval);
        Object.assign(subscriptionData, activationCreditsPayload);
    }
    
    // Scenario: An existing monthly subscriber upgrades to yearly
    const isUpgradingToYearly = newStatus === 'active' && previousStatus === 'active' && userData?.subscriptionInterval === 'month' && newInterval === 'year';
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
                if (session.mode === 'subscription') {
                   await handleCheckoutCompleted(adminDb, session);
                }
                break;

            case 'customer.subscription.created': {
                // Often redundant with checkout.session.completed but good for imported subs
                const subscriptionCreated = event.data.object as Stripe.Subscription;
                // Avoid double-processing if it was just handled by checkout.completed
                const userDoc = await findUserByStripeCustomerId(adminDb, subscriptionCreated.customer as string);
                if (userDoc && userDoc.data()?.subscriptionId !== subscriptionCreated.id) {
                     await handleSubscriptionChange(adminDb, subscriptionCreated);
                }
                break;
            }
            
            case 'customer.subscription.updated': {
                const subscriptionUpdated = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(adminDb, subscriptionUpdated);
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
        }
    } catch (error: any) {
        console.error(`Webhook handler failed for event type ${event.type}. Error: ${error.message}`);
        return new NextResponse('Webhook handler failed.', { status: 500 });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
