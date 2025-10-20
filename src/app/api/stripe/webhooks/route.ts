
'use server';

import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue }from 'firebase-admin/firestore';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Finds a user in Firestore by their Stripe customer ID.
 * @param stripeCustomerId - The Stripe customer ID.
 * @returns The user's document snapshot or null if not found.
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
    return userQuery.docs[0];
}

async function awardReferralCredits(referralCode: string) {
    if (!referralCode) return;
  
    try {
      const usersRef = adminDb.collection('users');
      const snapshot = await usersRef.where('referralCode', '==', referralCode).limit(1).get();
  
      if (!snapshot.empty) {
        const referringUserDoc = snapshot.docs[0];
        await referringUserDoc.ref.update({
          proposalCredits: FieldValue.increment(5)
        });
        console.log(`Awarded 5 credits to user ${referringUserDoc.id} for successful referral.`);
      } else {
          console.warn(`Attempted to award credits for non-existent referral code: "${referralCode}"`);
      }
    } catch (error) {
      console.error('Error awarding referral credits:', error);
    }
}

/**
 * Handles subscription creation or update events from Stripe and updates the corresponding user document in Firestore.
 * This function has been refactored for resilience.
 * @param subscription - The Stripe subscription object.
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    const stripeCustomerId = subscription.customer as string;
    const userDocSnapshot = await findUserByStripeCustomerId(stripeCustomerId);

    if (!userDocSnapshot) {
        console.warn(`No user found for Stripe customer ID: ${stripeCustomerId}. Skipping update.`);
        return;
    }
    
    const userDocRef = userDocSnapshot.ref;
    const userData = userDocSnapshot.data();
    
    if (!userData) {
      console.warn(`Could not read user data for Stripe customer ID: ${stripeCustomerId}.`);
      return;
    }

    let newStatus = subscription.status;
    if (subscription.cancel_at_period_end) {
        newStatus = 'canceled';
    }

    const price = subscription.items.data[0]?.price;
    const newInterval = price?.recurring?.interval;

    const previousStatus = userData.subscriptionStatus;
    const previousInterval = userData.subscriptionInterval;
    
    // --- START: Resilient Update Logic ---
    const updatePayload: { [key: string]: any } = {
        subscriptionId: subscription.id,
        subscriptionStatus: newStatus,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (newInterval) {
        updatePayload.subscriptionInterval = newInterval;
    }

    // Determine credit updates and add them to the payload.
    const isFirstTimeTrial = newStatus === 'trialing' && previousStatus !== 'trialing';
    const isNewPaidActivation = newStatus === 'active' && previousStatus !== 'active';
    const isUpgradingToYearly = previousStatus === 'active' && previousInterval === 'month' && newStatus === 'active' && newInterval === 'year';

    if (isFirstTimeTrial) {
        updatePayload.proposalCredits = FieldValue.increment(3);
    } else if (isNewPaidActivation) {
        if (newInterval === 'year') {
            updatePayload.proposalCredits = FieldValue.increment(100);
        } else {
            updatePayload.proposalCredits = FieldValue.increment(10);
        }
        // Handle referral only on the very first paid activation.
        if (userData.referredBy) {
            await awardReferralCredits(userData.referredBy);
            updatePayload.referredBy = FieldValue.delete(); // Prevent re-awarding
        }
    } else if (isUpgradingToYearly) {
        updatePayload.proposalCredits = FieldValue.increment(100);
    }
    
    // Perform the single, comprehensive update to Firestore.
    try {
        await userDocRef.update(updatePayload);
        console.log(`Successfully synced subscription for user ${userDocRef.id}. New status: ${newStatus}, Interval: ${newInterval || 'N/A'}`);
    } catch (error) {
        console.error(`CRITICAL: Firestore update failed for user ${userDocRef.id}. Error:`, error);
        console.error('Update Payload:', updatePayload);
    }
    // --- END: Resilient Update Logic ---
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
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === 'subscription' && session.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
                        expand: ['items.data.price'],
                    });
                    await handleSubscriptionChange(subscription);
                }
                break;
            
            case 'setup_intent.succeeded':
                const setupIntent = event.data.object as Stripe.SetupIntent;
                const { subscription_id, price_id } = setupIntent.metadata || {};
                
                if (subscription_id && price_id && setupIntent.payment_method) {
                    const subscription = await stripe.subscriptions.retrieve(subscription_id);
                    await stripe.subscriptions.update(subscription_id, {
                        items: [{
                            id: subscription.items.data[0].id,
                            price: price_id,
                        }],
                        trial_end: 'now',
                        proration_behavior: 'none',
                        default_payment_method: setupIntent.payment_method as string,
                    });
                }
                break;


            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscriptionUpdated = event.data.object as Stripe.Subscription;
                const expandedSubscription = await stripe.subscriptions.retrieve(subscriptionUpdated.id, {
                    expand: ['items.data.price'],
                });
                await handleSubscriptionChange(expandedSubscription);
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId = deletedSubscription.customer as string;
                const userDoc = await findUserByStripeCustomerId(stripeCustomerId);

                if (userDoc) {
                    await userDoc.ref.update({
                        subscriptionStatus: 'canceled',
                        subscriptionInterval: null, // Clear interval on cancellation
                    });
                     console.log(`Successfully marked subscription as canceled for user ${userDoc.id}.`);
                }
                break;

            case 'coupon.created':
            case 'coupon.deleted':
            case 'coupon.updated':
                // We can revalidate the coupons page to show the latest data
                revalidatePath('/admin-portal/coupons');
                console.log(`Coupon event received: ${event.type}`);
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
