
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

async function createCheckoutSession(
    firebaseUid: string,
    stripeCustomerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    couponId: string | null,
    isTrial: boolean = false
): Promise<{ redirectUrl?: string; error?: string }> {
    try {
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId,
            client_reference_id: firebaseUid,
            success_url: successUrl,
            cancel_url: cancelUrl,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
        };

        if (isTrial) {
            sessionParams.subscription_data = {
                trial_period_days: 2,
                 metadata: {
                    firebaseUID: firebaseUid
                }
            };
        } else {
            sessionParams.subscription_data = {
                metadata: {
                    firebaseUID: firebaseUid
                }
            };
        }
        
        if (couponId) {
            sessionParams.discounts = [{ promotion_code: couponId }];
        }

        const session = await stripe.checkout.sessions.create(sessionParams);
        return { redirectUrl: session.url! };

    } catch (error: any) {
        console.error("Error creating checkout session:", error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}


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
        return { error: "User is not properly authenticated. Please log in again." };
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
        // Scenario 1: New user starting a trial
        if (!subscriptionStatus || subscriptionStatus === 'null' || subscriptionStatus === 'undefined') {
             return await createCheckoutSession(firebaseUid, stripeCustomerId, priceId, successUrl, cancelUrl, coupon, true);
        }

        // Scenario 2: User is in trial and activating their plan
        if (subscriptionStatus === 'trialing' && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const updateParams: Stripe.SubscriptionUpdateParams = {
                items: [{ id: subscription.items.data[0].id, price: priceId }],
                trial_end: 'now',
                proration_behavior: 'none',
            };
             if (coupon) {
                updateParams.promotion_code = coupon;
            }
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, updateParams);
            
            try {
                const { adminDb } = await getFirebaseAdmin();
                if (adminDb) {
                    const newPrice = updatedSubscription.items.data[0]?.price;
                    await adminDb.collection('users').doc(firebaseUid).update({
                        subscriptionStatus: 'active',
                        subscriptionInterval: newPrice?.recurring?.interval,
                        lastPrice: newPrice?.unit_amount ? newPrice.unit_amount / 100 : null,
                        subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }
            } catch (dbError: any) {
                console.error("Non-critical error: Failed to immediately update Firestore after plan activation:", dbError.message);
            }
            
            revalidatePath('/pricing');
            revalidatePath('/dashboard');

            const planName = interval === 'yearly' ? 'Yearly' : 'Monthly';
            return { success: true, message: `Your ${planName} plan has been activated successfully!` };
        }
        
        // Scenario 3: User is on active monthly and upgrading to yearly
        if (subscriptionStatus === 'active' && subscriptionId && currentInterval === 'month' && interval === 'yearly') {
             const subscription = await stripe.subscriptions.retrieve(subscriptionId);
             const updateParams: Stripe.SubscriptionUpdateParams = {
                items: [{ id: subscription.items.data[0].id, price: priceId }],
                proration_behavior: 'create_prorations',
            };
             if (coupon) {
                updateParams.promotion_code = coupon;
            }
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, updateParams);
            
            try {
                const { adminDb } = await getFirebaseAdmin();
                if (adminDb) {
                    const newPrice = updatedSubscription.items.data[0]?.price;
                    await adminDb.collection('users').doc(firebaseUid).update({
                        subscriptionStatus: 'active', // Status remains active
                        subscriptionInterval: newPrice?.recurring?.interval,
                        lastPrice: newPrice?.unit_amount ? newPrice.unit_amount / 100 : null,
                        subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }
            } catch (dbError: any) {
                 console.error("Non-critical error: Failed to immediately update Firestore after plan upgrade:", dbError.message);
            }

            revalidatePath('/pricing');
            return { success: true, message: 'Your plan has been successfully switched to Yearly!' };
        }

        // Scenario 4: User had a canceled or failed sub and is reactivating
        if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
            const checkoutResult = await createCheckoutSession(firebaseUid, stripeCustomerId, priceId, successUrl, cancelUrl, coupon, false);
            return checkoutResult;
        }
        
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
  // This function depends on getting the user from the server session.
  const { getCurrentUser } = await import('@/lib/firebase/server-auth');
  
  let currentUser;
  try {
    currentUser = await getCurrentUser();
  } catch (error: any) {
    console.error("Authentication check failed:", error.message);
    return { error: error.message };
  }
  
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
        id: promoCode.id,
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


    