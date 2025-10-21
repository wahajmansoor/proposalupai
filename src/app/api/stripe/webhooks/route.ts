'use server';

import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

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

/**
 * Adds a record to the user's credit history.
 */
async function logCreditHistory(userId: string, amount: number, reason: string) {
    if (!userId || !amount || !reason) return;
    try {
        await adminDb.collection('users').doc(userId).collection('creditHistory').add({
            amount,
            reason,
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error(`Failed to log credit history for user ${userId}:`, error);
    }
}


async function awardReferralCredits(referralCode: string, newUserName: string | null) {
    if (!referralCode) return;
  
    try {
      const usersRef = adminDb.collection('users');
      const snapshot = await usersRef.where('referralCode', '==', referralCode).limit(1).get();
  
      if (!snapshot.empty) {
        const referringUserDoc = snapshot.docs[0];
        const referredFriendName = newUserName || 'your friend';
        await referringUserDoc.ref.update({
          proposalCredits: FieldValue.increment(5)
        });
        await logCreditHistory(referringUserDoc.id, 5, `Referral bonus for ${referredFriendName} subscribing`);
        console.log(`Awarded 5 credits to user ${referringUserDoc.id} for successful referral.`);
      } else {
          console.warn(`Attempted to award credits for non-existent referral code: "${referralCode}"`);
      }
    } catch (error) {
      console.error('Error awarding referral credits:', error);
    }
}

async function handleSubscriptionUpgrade(userDocRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) {
    const userData = (await userDocRef.get()).data();
    if (!userData || userData.upgradeBonusGiven) {
        console.log(`Skipping upgrade bonus for ${userDocRef.id}, already given or user data missing.`);
        return;
    }

    const creditsToAdd = 100;
    const reason = 'Upgraded to Pro Yearly';
    
    await userDocRef.update({
        proposalCredits: FieldValue.increment(creditsToAdd),
        upgradeBonusGiven: true
    });
    await logCreditHistory(userDocRef.id, creditsToAdd, reason);
    console.log(`Applied +100 upgrade credits for ${userDocRef.id}`);
}


/**
 * Handles subscription creation or update events from Stripe and updates the corresponding user document in Firestore.
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

    // SCENARIO: A user starts a trial for the first time
    const isStartingTrial = newStatus === 'trialing' && previousStatus !== 'trialing';
    if (isStartingTrial) {
        let creditsToAdd = 3;
        let reason = '2-Day trial activation';

        if (userData?.referredBy) {
            creditsToAdd += 5;
            reason += ' (+5 referral bonus)';
        }
        
        subscriptionData.proposalCredits = FieldValue.increment(creditsToAdd);
        await logCreditHistory(userDocRef.id, creditsToAdd, reason);
    }

    // SCENARIO: A user's trial converts to an active paid plan or a canceled user reactivates
    const isNewActivation = newStatus === 'active' && previousStatus !== 'active';
    if (isNewActivation) {
        let creditsToAdd = 0;
        let reason = '';
        if (newInterval === 'year') {
            creditsToAdd = 100;
            reason = 'Pro Yearly plan activation';
        } else if (newInterval === 'month') {
            creditsToAdd = 10;
            reason = 'Pro Monthly plan activation';
        }

        if (userData?.referredBy) {
            await awardReferralCredits(userData.referredBy, userData.displayName);
            subscriptionData.referredBy = FieldValue.delete();
        }

        if (creditsToAdd > 0) {
            subscriptionData.proposalCredits = FieldValue.increment(creditsToAdd);
            await logCreditHistory(userDocRef.id, creditsToAdd, reason);
        }
    }
    
    await userDocRef.update(subscriptionData);
    console.log(`Successfully synced subscription for user ${userDocRef.id}. New status: ${newStatus}, Interval: ${newInterval}`);
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
            
            case 'customer.subscription.created':
                const createdSubscription = event.data.object as Stripe.Subscription;
                const expandedCreatedSub = await stripe.subscriptions.retrieve(createdSubscription.id, {
                    expand: ['items.data.price'],
                });
                await handleSubscriptionChange(expandedCreatedSub);
                break;

            case 'customer.subscription.updated':
                const subscriptionUpdated = event.data.object as Stripe.Subscription;
                const previousAttributes = event.data.previous_attributes;

                // Check for upgrade from monthly to yearly
                const newInterval = subscriptionUpdated.items.data[0].price?.recurring?.interval;
                const oldInterval = previousAttributes?.items?.data?.[0]?.price?.recurring?.interval;
                const isUpgradingToYearly = subscriptionUpdated.status === 'active' && newInterval === 'year' && oldInterval === 'month';
                
                if (isUpgradingToYearly) {
                     const userDoc = await findUserByStripeCustomerId(subscriptionUpdated.customer as string);
                     if (userDoc) {
                        await handleSubscriptionUpgrade(userDoc.ref);
                     }
                }
                
                const expandedSubscription = await stripe.subscriptions.retrieve(subscriptionUpdated.id, {
                    expand: ['items.data.price'],
                });
                await handleSubscriptionChange(expandedSubscription);
                break;

            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId = deletedSubscription.customer as string;
                const userDocToDelete = await findUserByStripeCustomerId(stripeCustomerId);

                if (userDocToDelete) {
                    await userDocToDelete.ref.update({
                        subscriptionStatus: 'canceled',
                        subscriptionInterval: null, // Clear interval on cancellation
                        upgradeBonusGiven: FieldValue.delete(), // Reset bonus flag
                    });
                     console.log(`Successfully marked subscription as canceled for user ${userDocToDelete.id}.`);
                }
                break;

            case 'coupon.created':
            case 'coupon.deleted':
            case 'coupon.updated':
                revalidatePath('/admin-portal/coupons');
                console.log(`Coupon event received: ${event.type}`);
                break;
            
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error: any) {
        console.error(`Webhook handler failed for event type ${event.type}. Error: ${error.message}`);
        return new NextResponse('Webhook handler failed.', { status: 500 });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
