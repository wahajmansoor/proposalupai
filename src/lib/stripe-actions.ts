
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

// --- Credit Logic (Moved from credits.ts for stability) ---

async function logCreditHistory(db: Firestore, userId: string, amount: number, reason:string) {
  if (!userId || !amount || !reason) return;
  try {
    await db.collection('users').doc(userId).collection('creditHistory').add({
      amount,
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Logged ${amount} credits for user ${userId}. Reason: ${reason}`);
  } catch (error) {
    console.error(`Failed to log credit history for user ${userId}:`, error);
  }
}

async function awardReferralBonusToReferrer(db: Firestore, referralCode: string, newUserName: string | null) {
  if (!referralCode) return;

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('referralCode', '==', referralCode).limit(1).get();

    if (!snapshot.empty) {
      const referringUserDoc = snapshot.docs[0];
      const referredFriendName = newUserName || 'your friend';
      
      await referringUserDoc.ref.update({
        proposalCredits: FieldValue.increment(5)
      });
      
      await logCreditHistory(db, referringUserDoc.id, 5, `Referral bonus for ${referredFriendName} subscribing`);
      console.log(`Awarded 5 credits to user ${referringUserDoc.id} for successful referral.`);
    } else {
      console.warn(`Attempted to award referral bonus for non-existent referral code: "${referralCode}"`);
    }
  } catch (error) {
    console.error('Error awarding referral credits:', error);
  }
}

async function handleNewTrial(db: Firestore, userId: string, userData: DocumentData) {
    let creditsToAdd = 3;
    let reason = '2-Day trial activation';

    if (userData?.referredBy) {
        creditsToAdd += 5;
        reason += ' (+5 referral bonus)';
    }
    
    await logCreditHistory(db, userId, creditsToAdd, reason);
    await db.collection('users').doc(userId).update({
        proposalCredits: FieldValue.increment(creditsToAdd)
    });
}

async function handlePlanActivation(db: Firestore, userId: string, userData: DocumentData, newInterval?: 'month' | 'year') {
    let creditsToAdd = 0;
    let reason = '';
    const updatePayload: { [key: string]: any } = {};

    if (newInterval === 'year') {
        creditsToAdd = 100;
        reason = 'Pro Yearly plan activation';
    } else if (newInterval === 'month') {
        creditsToAdd = 10;
        reason = 'Pro Monthly plan activation';
    }
    
    if (userData?.referredBy) {
        await awardReferralBonusToReferrer(db, userData.referredBy, userData.displayName);
        updatePayload.referredBy = FieldValue.delete();
    }

    if (creditsToAdd > 0) {
        updatePayload.proposalCredits = FieldValue.increment(creditsToAdd);
        await logCreditHistory(db, userId, creditsToAdd, reason);
    }
    
    if (Object.keys(updatePayload).length > 0) {
        await db.collection('users').doc(userId).update(updatePayload);
    }
}

async function handlePlanUpgrade(db: Firestore, userId: string, userData: DocumentData) {
    const creditsToAdd = 100;
    const reason = 'Upgraded to Pro Yearly';
    
    await logCreditHistory(db, userId, creditsToAdd, reason);
    
    await db.collection('users').doc(userId).update({
        proposalCredits: FieldValue.increment(creditsToAdd),
        upgradeBonusGiven: true,
    });
}


// --- Main Stripe Actions ---

export async function handlePlanChange(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  redirectUrl?: string;
  message?: string;
}> {
  let interval = formData.get('interval') as 'monthly' | 'yearly' | null;
  const coupon = formData.get('coupon') as string | null;
  const firebaseUid = formData.get('firebaseUid') as string | null;
  const stripeCustomerId = formData.get('stripeCustomerId') as string | null;
  const subscriptionStatus = formData.get('subscriptionStatus') as string | null;
  const subscriptionId = formData.get('subscriptionId') as string | null;
  const currentInterval = formData.get('currentInterval') as 'month' | 'year' | null;

  if (!adminDb) {
    return { error: 'The server is not configured correctly. Please contact support.' };
  }

  if (!firebaseUid || !stripeCustomerId) {
    return { error: 'User is not properly authenticated. Please log in again.' };
  }
  
  if (!interval) {
    interval = 'monthly';
  }

  if (interval !== 'monthly' && interval !== 'yearly') {
    return { error: 'Invalid billing interval selected.' };
  }

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID!;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID!;
  const priceId = interval === 'yearly' ? yearlyPriceId : monthlyPriceId;

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const origin = `${protocol}://${host}`;
  const successUrl = `${origin}/dashboard?subscribed=true&interval=${interval}`;
  const cancelUrl = `${origin}/pricing`;

  try {
    const userQuery = await adminDb.collection('users').where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
    if (userQuery.empty) {
      return { error: 'User not found in database.' };
    }
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Scenario 1: New user starting a trial
    if (!subscriptionStatus || subscriptionStatus === 'null' || subscriptionStatus === 'undefined') {
       await handleNewTrial(adminDb, userDoc.id, userData);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: stripeCustomerId,
        client_reference_id: firebaseUid,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        subscription_data: {
          trial_period_days: 2,
        },
      };

      if (coupon) {
        sessionParams.discounts = [{ coupon }];
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return { redirectUrl: session.url! };
    }
    
    // Scenario 2: User is on a trial and activating a plan
    if (subscriptionStatus === 'trialing' && subscriptionId) {
      await stripe.subscriptions.update(subscriptionId, {
        trial_end: 'now',
        coupon: coupon || undefined,
      });

      await handlePlanActivation(adminDb, userDoc.id, userData, interval);
      
      revalidatePath('/pricing');
      return { success: true, message: 'Your plan has been successfully activated!' };
    }


    // Scenario 3: User is on active monthly and upgrading to yearly
    if (subscriptionStatus === 'active' && subscriptionId && currentInterval === 'month' && interval === 'yearly') {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      if (!userData.upgradeBonusGiven) {
        await handlePlanUpgrade(adminDb, userDoc.id, userData);
      }
      
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: subscription.items.data[0].id, price: priceId }],
        proration_behavior: 'create_prorations',
        coupon: coupon || undefined,
      });

      revalidatePath('/pricing');
      return { success: true, message: 'Your plan has been successfully switched to Yearly!' };
    }

    // Scenario 4: User had a canceled or failed sub and is reactivating
    if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId,
            client_reference_id: firebaseUid,
            success_url: successUrl,
            cancel_url: cancelUrl,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
        };

        if (coupon) {
            sessionParams.discounts = [{ coupon }];
        }
        
        const session = await stripe.checkout.sessions.create(sessionParams);
        return { redirectUrl: session.url! };
    }
    
    // Fallback if no specific action is matched (e.g., trying to subscribe to the same plan)
    return { error: 'No valid action could be determined for your subscription state.' };

  } catch (error: any) {
    console.error("Error in handlePlanChange:", error);
    if (error.raw?.message?.includes('not specified for use with this customer')) {
        return { error: 'This coupon code is not valid for your account.' };
    }
    if (error.code === 'coupon_invalid' || error.code === 'promotion_code_invalid' || error.code === 'promotion_code_expired') {
        return { error: 'The provided coupon code is invalid or has expired.' };
    }
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function createCustomerPortalSession(): Promise<{ url?: string; error?: string }> {
  const { getCurrentUser } = await import('@/lib/firebase/server-auth');
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'User not authenticated. Please log in again.' };
  }

  const { userDoc } = currentUser;
  const stripeCustomerId = userDoc?.stripeCustomerId;

  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID not found for this user.' };
  }

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const returnUrl = `${protocol}://${host}/subscription`;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    if (!portalSession.url) {
      return { error: 'Could not create customer portal session.' };
    }

    return { url: portalSession.url };
  } catch (error: any) {
    console.error('Error creating customer portal session:', error.message);
    if (error.message && error.message.includes('No configuration provided')) {
      return {
        error:
          'Stripe Customer Portal is not configured. Please set it up in your Stripe dashboard at dashboard.stripe.com/test/settings/billing/portal',
      };
    }
    return {
      error:
        'An unexpected error occurred while creating the billing portal session.',
    };
  }
}

const validateCouponSchema = z.object({
  code: z.string(),
  plan: z.enum(['monthly', 'yearly']),
});

export async function validateCouponAction(formData: FormData): Promise<{
    success: boolean;
    error?: string;
    coupon?: {
        id: string;
        name: string | null;
        percent_off: number | null;
        amount_off: number | null;
    };
}> {
  const validatedFields = validateCouponSchema.safeParse({
    code: formData.get('code'),
    plan: formData.get('plan'),
  });

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid coupon code or plan.' };
  }

  const { code, plan } = validatedFields.data;

  try {
    const promotionCodes = await stripe.promotionCodes.list({
      code: code,
      active: true,
      limit: 1,
      expand: ['data.coupon']
    });

    if (promotionCodes.data.length === 0) {
      return { success: false, error: 'This coupon code is invalid or has expired.' };
    }

    const promoCode = promotionCodes.data[0];
    const coupon = promoCode.coupon as Stripe.Coupon;

    if (!coupon.valid) {
        return { success: false, error: 'This coupon is no longer valid.' };
    }

    const appliesToPlan = coupon.metadata?.applies_to_plan;
    if (appliesToPlan && appliesToPlan !== 'any' && appliesToPlan !== plan) {
        return { success: false, error: `This coupon is only valid for the ${appliesToPlan} plan.` };
    }

    return {
      success: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
      },
    };
  } catch (error: any) {
    console.error("Stripe API error validating coupon:", error);
    return { success: false, error: 'Could not validate coupon code.' };
  }
}
