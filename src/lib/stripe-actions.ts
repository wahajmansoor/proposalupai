
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { z } from 'zod';
import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { adminDb, getFirebaseAdmin } from '@/lib/firebase/admin';
import { getCountryFromIp } from '@/app/lib/location';

async function createCheckoutSession(
  stripeCustomerId: string,
  firebaseUid: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  couponId: string | null,
  isTrial: boolean
): Promise<{ redirectUrl?: string; error?: string }> {
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      client_reference_id: firebaseUid, // Pass Firebase UID here
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
            firebaseUID: firebaseUid,
        }
      }
    };

    if (isTrial) {
        sessionParams.subscription_data!.trial_period_days = 2;
        // Don't require payment method for trial
        sessionParams.payment_method_collection = 'if_required';
        sessionParams.payment_method_setup_mode = 'if_required';
    }
    
    if (couponId) {
      sessionParams.discounts = [{ promotion_code: couponId }];
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
    if (!checkoutSession.url) {
      return { error: 'Could not create checkout session.' };
    }
    return { redirectUrl: checkoutSession.url };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return { error: error.message || 'An unexpected error occurred during checkout creation.' };
  }
}

export async function handlePlanChange(formData: FormData): Promise<{
    success?: boolean;
    error?: string;
    redirectUrl?: string;
}> {
    const interval = formData.get('interval') as 'monthly' | 'yearly';
    const coupon = formData.get('coupon') as string | null;

    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.userDoc) {
        return { redirectUrl: '/login' };
    }

    const { user, userDoc } = currentUser;
    const { stripeCustomerId, subscriptionStatus, subscriptionId } = userDoc;

    if (!stripeCustomerId) {
        return { error: 'Could not find Stripe customer ID. Please contact support.' };
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
        // Scenario: New user starting a trial OR a canceled user resubscribing
        if (!subscriptionStatus || subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
            return await createCheckoutSession(stripeCustomerId, user.uid, priceId, successUrl, cancelUrl, coupon, true);
        }

        // Scenario: Active trial user is activating their plan by providing payment details
        if (subscriptionStatus === 'trialing' && subscriptionId) {
             const checkoutSession = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'setup',
                customer: stripeCustomerId,
                setup_intent_data: {
                    metadata: {
                        customer_id: stripeCustomerId,
                        subscription_id: subscriptionId,
                    },
                },
                success_url: successUrl,
                cancel_url: cancelUrl,
            });
             if (!checkoutSession.url) {
                return { error: 'Could not create checkout session.' };
            }
            return { redirectUrl: checkoutSession.url };
        }

        // Scenario: Active monthly user switching to yearly
        if (subscriptionStatus === 'active' && userDoc.subscriptionInterval === 'month' && interval === 'yearly' && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await stripe.subscriptions.update(subscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: priceId,
                }],
                proration_behavior: 'create_prorations',
                promotion_code: coupon || undefined,
                metadata: {
                    firebaseUID: user.uid,
                }
            });
            revalidatePath('/pricing');
            return { success: true };
        }

        return { error: 'No valid action could be determined for your subscription state.' };

    } catch (error: any) {
        console.error("Error in handlePlanChange:", error);
        return { error: error.raw?.message || error.message || "An unknown error occurred." };
    }
}


export async function createCustomerPortalSession(): Promise<{ url?: string; error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.userDoc?.stripeCustomerId) {
    return { error: 'Stripe customer ID not found.' };
  }

  const { stripeCustomerId } = currentUser.userDoc;
  
  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const returnUrl = `${protocol}://${host}/subscription`;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };

  } catch (error: any) {
    console.error("Error creating admin customer portal session:", error);
    return { error: error.message || "Failed to create billing session." };
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
