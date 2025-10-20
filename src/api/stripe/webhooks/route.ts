
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
 * @param subscription - The Stripe subscription object.
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
    if (!subscription || !subscription.customer) {
      console.warn('Webhook Warning: Missing subscription or customer data.');
      return;
    }
  
    const stripeCustomerId = subscription.customer as string;
    const userDocSnapshot = await findUserByStripeCustomerId(stripeCustomerId);
  
    if (!userDocSnapshot) {
      console.warn(`No user found for Stripe customer ID: ${stripeCustomerId}. Skipping update.`);
      return;
    }
  
    const userDocRef = userDocSnapshot.ref;
    const userData = userDocSnapshot.data();
  
    // --- Handle ambiguous or pending statuses ---
    // Stripe may report 'incomplete' before trial starts; treat it as 'trialing' for user experience.
    let newStatus = subscription.status;
    if (newStatus === 'incomplete' && subscription.trial_end) {
      newStatus = 'trialing';
    }
  
    // --- Treat cancel_at_period_end as canceled ---
    if (subscription.cancel_at_period_end) {
      newStatus = 'canceled';
    }
  
    // --- Extract interval safely ---
    const price = subscription.items.data[0]?.price;
    const newInterval = price?.recurring?.interval || userData?.subscriptionInterval || null;
  
    // --- Compare with previous values to determine what changed ---
    const previousStatus = userData?.subscriptionStatus;
    const previousInterval = userData?.subscriptionInterval;
  
    const subscriptionData: Record<string, any> = {
      subscriptionId: subscription.id,
      subscriptionStatus: newStatus,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: FieldValue.serverTimestamp(),
    };
  
    if (newInterval) {
      subscriptionData.subscriptionInterval = newInterval;
    }
  
    // --- First trial activation ---
    if (newStatus === 'trialing' && previousStatus !== 'trialing') {
      subscriptionData.proposalCredits = FieldValue.increment(3);
      console.log(`Trial started for user ${userDocRef.id}: awarded 3 credits.`);
    }
  
    // --- First paid activation (from trial or direct purchase) ---
    const isNewActivation = newStatus === 'active' && previousStatus !== 'active';
    if (isNewActivation) {
      if (newInterval === 'year') {
        subscriptionData.proposalCredits = FieldValue.increment(100);
      } else if (newInterval === 'month') {
        subscriptionData.proposalCredits = FieldValue.increment(10);
      }
  
      // Handle referral bonus once per user
      if (userData?.referredBy) {
        await awardReferralCredits(userData.referredBy);
        subscriptionData.referredBy = FieldValue.delete();
      }
  
      console.log(`Activated paid subscription for user ${userDocRef.id}. Awarded credits for ${newInterval} plan.`);
    }
  
    // --- Upgrade from monthly → yearly ---
    const isUpgrade =
      previousStatus === 'active' &&
      previousInterval === 'month' &&
      newStatus === 'active' &&
      newInterval === 'year';
  
    if (isUpgrade) {
      subscriptionData.proposalCredits = FieldValue.increment(100);
      console.log(`User ${userDocRef.id} upgraded from monthly to yearly. Awarded 100 credits.`);
    }
  
    // --- Gracefully handle unchanged or repeated events ---
    if (previousStatus === newStatus && previousInterval === newInterval) {
      console.log(`No meaningful changes for user ${userDocRef.id}, skipping redundant update.`);
      return;
    }
  
    // --- Write to Firestore ---
    try {
      await userDocRef.update(subscriptionData);
      console.log(
        `Successfully synced subscription for user ${userDocRef.id}. Status: ${newStatus}, Interval: ${newInterval}`
      );
    } catch (error) {
      console.error(`Firestore update failed for user ${userDocRef.id}:`, error);
    }
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
                if (session.mode === 'subscription') {
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
                const subscription = event.data.object as Stripe.Subscription;
                const expandedSubscription = await stripe.subscriptions.retrieve(subscription.id, {
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
