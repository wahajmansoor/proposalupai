
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { FieldValue, type Firestore, type DocumentReference, type DocumentData } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';


// --- Credit Handling Logic ---
async function addCredits(db: Firestore, userRef: DocumentReference, amount: number, reason: string) {
    const creditHistoryRef = userRef.collection('creditHistory');
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const currentCredits = userDoc.data()?.proposalCredits || 0;
        
        transaction.update(userRef, {
            proposalCredits: FieldValue.increment(amount)
        });
        transaction.set(creditHistoryRef.doc(), {
            amount: amount,
            reason: reason,
            createdAt: FieldValue.serverTimestamp()
        });
    });
}

async function handleNewTrial(db: Firestore, userId: string, userData: DocumentData) {
    const userRef = db.collection('users').doc(userId);
    // Only give trial credits if they haven't been given them before.
    if (userData.proposalCredits === undefined || userData.proposalCredits < 5) {
        await addCredits(db, userRef, 5, 'Started a new trial');
    }
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
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                trial_end: 'now',
                cancel_at_period_end: false,
                items: [{
                    id: subscription.items.data[0].id,
                    price: priceId,
                }],
                proration_behavior: 'create_prorations',
                coupon: coupon || undefined,
            });

            // Directly update Firestore to ensure status is reflected immediately
            await userDoc.ref.update({
                subscriptionStatus: 'active',
                subscriptionInterval: updatedSubscription.items.data[0].price.recurring?.interval,
                lastPrice: updatedSubscription.items.data[0].price.unit_amount ? updatedSubscription.items.data[0].price.unit_amount / 100 : null,
                subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
                updatedAt: FieldValue.serverTimestamp(),
            });

            revalidatePath('/pricing');
            revalidatePath('/subscription');
            return { success: true, message: `Your trial has ended and your ${interval} plan is now active!` };
        } catch (error: any) {
            if (error.code === 'customer_without_payment_method') {
                 // The user started trial without a card, so we need to send them to a checkout page to add one.
                const session = await stripe.checkout.sessions.create({
                    customer: stripeCustomerId,
                    success_url: `${origin}/api/stripe/activate-trial?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: cancelUrl,
                    mode: 'setup',
                    setup_intent_data: {
                        metadata: {
                            subscription_id: subscriptionId,
                            price_id: priceId,
                            coupon_id: coupon || '',
                        }
                    }
                });
                return { redirectUrl: session.url! };
            }
            throw error; // Re-throw other errors
        }
    }


    // Scenario 3: User is on active monthly and upgrading to yearly
    if (subscriptionStatus === 'active' && subscriptionId && currentInterval === 'month' && interval === 'yearly') {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: subscription.items.data[0].id, price: priceId }],
        proration_behavior: 'create_prorations',
        coupon: coupon || undefined,
        cancel_at_period_end: false,
      });

      // Immediately update the database
      await userDoc.ref.update({
          subscriptionStatus: 'active',
          subscriptionInterval: 'year',
          lastPrice: updatedSubscription.items.data[0].price.unit_amount ? updatedSubscription.items.data[0].price.unit_amount / 100 : null,
          subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
          updatedAt: FieldValue.serverTimestamp(),
      });

      revalidatePath('/pricing');
      revalidatePath('/subscription');
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

const creditPurchaseSchema = z.object({
  priceId: z.string(),
});

export async function createCreditPurchaseSession(formData: FormData): Promise<{ url?: string; error?: string }> {
  const { getCurrentUser } = await import('@/lib/firebase/server-auth');
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'User not authenticated. Please log in again.' };
  }

  const validatedFields = creditPurchaseSchema.safeParse({
    priceId: formData.get('priceId'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid credit package selected.' };
  }
  
  const { priceId } = validatedFields.data;
  const { stripeCustomerId, uid } = currentUser.userDoc as { stripeCustomerId: string, uid: string };
  
  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID not found for this user.' };
  }

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const origin = `${protocol}://${host}`;
  const successUrl = `${origin}/subscription?credits_purchased=true`;
  const cancelUrl = `${origin}/subscription`;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: uid,
      success_url: successUrl,
      cancel_url: cancelUrl,
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      payment_intent_data: {
        metadata: {
          purchase_type: 'credits',
          firebase_uid: uid,
          price_id: priceId
        },
      },
    });

    return { url: session.url! };
  } catch (error: any) {
    console.error('Error creating credit purchase session:', error);
    return { error: 'Could not create a checkout session for credits.' };
  }
}

