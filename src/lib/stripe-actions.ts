
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { z } from 'zod';
import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';

const checkoutSessionSchema = z.object({
  interval: z.enum(['monthly', 'yearly']),
});

export async function createCheckoutSession(formData: FormData) {
  const validatedFields = checkoutSessionSchema.safeParse({
    interval: formData.get('interval'),
  });

  if (!validatedFields.success) {
    throw new Error('Invalid billing interval selected.');
  }

  const { interval } = validatedFields.data;

  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.userDoc) {
    return redirect('/login');
  }

  const { user, userDoc } = currentUser;
  const { stripeCustomerId, subscriptionStatus, subscriptionId } = userDoc;

  if (!stripeCustomerId) {
    throw new Error('Could not find Stripe customer ID. Please contact support.');
  }

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const origin = `${protocol}://${host}`;
  const successUrl = `${origin}/dashboard?subscribed=true&interval=${interval}`;
  const cancelUrl = `${origin}/pricing`;

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

  if (!monthlyPriceId || monthlyPriceId.includes('your_stripe_price_id_here')) {
    throw new Error('Monthly Stripe Price ID is not configured.');
  }
  if (!yearlyPriceId || yearlyPriceId.includes('your_stripe_price_id_here')) {
    throw new Error('Yearly Stripe Price ID is not configured.');
  }
  
  const priceId = interval === 'yearly' ? yearlyPriceId : monthlyPriceId;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    customer: stripeCustomerId,
    client_reference_id: user.uid,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  };
  
  // Case 1: User has an active subscription and is upgrading/changing plans
  if (subscriptionStatus === 'active' && subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Create a setup intent session to update the subscription
    const setupSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      setup_intent_data: {
        metadata: {
          subscription_id: subscriptionId,
          price_id: priceId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    
    if (!setupSession.url) {
        throw new Error('Could not create setup session for plan change.');
    }
    
    redirect(setupSession.url);
    return; // End execution here
  }
  
  // Case 2: New user or expired user starting a new subscription
  sessionParams.mode = 'subscription';
  sessionParams.line_items = [{ price: priceId, quantity: 1 }];
  
  // Only give trials to users who are not active or trialing
  if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') {
    sessionParams.subscription_data = {
      trial_period_days: 2,
    };
  }
  
  let checkoutSession: Stripe.Checkout.Session;
  try {
    checkoutSession = await stripe.checkout.sessions.create(sessionParams);
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    throw new Error('Failed to connect to Stripe. Please try again later.');
  }

  if (!checkoutSession.url) {
    throw new Error('Could not create checkout session');
  }

  redirect(checkoutSession.url);
}

const activateTrialSchema = z.object({
  interval: z.enum(['monthly', 'yearly']),
  coupon: z.string().optional(),
});

export async function activateTrialAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const validatedFields = activateTrialSchema.safeParse({
    interval: formData.get('interval'),
    coupon: formData.get('coupon'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid billing interval selected.' };
  }
  const { interval, coupon } = validatedFields.data;

  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.userDoc) {
    return { error: 'You must be logged in to activate a plan.' };
  }
  
  const { userDoc } = currentUser;
  const { subscriptionStatus, subscriptionId } = userDoc;

  if (subscriptionStatus !== 'trialing' || !subscriptionId) {
    return { error: 'You are not in a trial period or the subscription is missing.' };
  }

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
  const newPriceId = interval === 'yearly' ? yearlyPriceId : monthlyPriceId;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updateParams: Stripe.SubscriptionUpdateParams = {
        items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
        }],
        trial_end: 'now',
        proration_behavior: 'none',
    };
    
    if (coupon) {
      // Find the promotion code to get the coupon id
      const promotionCodes = await stripe.promotionCodes.list({ code: coupon, active: true });
      if (promotionCodes.data.length > 0) {
        updateParams.coupon = promotionCodes.data[0].coupon.id;
      }
    }

    await stripe.subscriptions.update(subscriptionId, updateParams);
    
    revalidatePath('/pricing');
    
    return { success: true };

  } catch (error: any) {
    console.error('Error activating trial subscription:', error);
    return { error: error.message || 'An unexpected error occurred while activating your plan.' };
  }
}

export async function upgradeSubscriptionAction(): Promise<{ success?: boolean; error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.userDoc) {
    return { error: 'You must be logged in to upgrade your plan.' };
  }

  const { subscriptionStatus, subscriptionId, subscriptionInterval } = currentUser.userDoc;

  if (subscriptionStatus !== 'active' || subscriptionInterval !== 'month' || !subscriptionId) {
    return { error: 'You are not on an active monthly plan eligible for an upgrade.' };
  }

  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
  if (!yearlyPriceId) {
    return { error: 'Yearly plan is not configured.' };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: yearlyPriceId,
      }],
      proration_behavior: 'create_prorations',
      trial_end: 'now', // Ensure any residual trial is ended
    });

    revalidatePath('/pricing');
    return { success: true };
    
  } catch (error: any) {
    console.error('Error upgrading subscription:', error);
    return { error: 'Failed to upgrade your plan. Please try again.' };
  }
}

const changeTrialPlanSchema = z.object({
  interval: z.enum(['monthly', 'yearly']),
});

export async function changeTrialPlanAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const validatedFields = changeTrialPlanSchema.safeParse({
    interval: formData.get('interval'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid billing interval selected.' };
  }
  const { interval } = validatedFields.data;
  
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.userDoc) {
    return { error: 'You must be logged in to change your plan.' };
  }

  const { subscriptionStatus, subscriptionId } = currentUser.userDoc;

  if (subscriptionStatus !== 'trialing' || !subscriptionId) {
    return { error: 'You are not in a trial period or the subscription is missing.' };
  }
  
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
  const newPriceId = interval === 'yearly' ? yearlyPriceId : monthlyPriceId;
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price']
    });
    
    await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'none', // No proration change during trial
    });

    revalidatePath('/pricing');
    return { success: true };
    
  } catch (error: any) {
    console.error('Error changing trial plan:', error);
    return { error: 'Failed to change your plan. Please try again.' };
  }
}


export async function createCustomerPortalSession(): Promise<{ url?: string; error?: string }> {
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
  const returnUrl = `${protocol}://${host}/profile`;

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

const couponValidationSchema = z.object({
    code: z.string().min(1, 'Coupon code cannot be empty.'),
    plan: z.enum(['monthly', 'yearly']),
});

export async function validateCouponAction(formData: FormData): Promise<{
    success: boolean;
    error?: string;
    coupon?: {
        id: string; // This will be the promotion code itself
        name: string | null;
        percent_off: number | null;
        amount_off: number | null;
    };
}> {
    const validatedFields = couponValidationSchema.safeParse({
        code: formData.get('code'),
        plan: formData.get('plan'),
    });

    if (!validatedFields.success) {
        return { success: false, error: 'Invalid input.' };
    }

    const { code, plan } = validatedFields.data;

    try {
        const promotionCodes = await stripe.promotionCodes.list({
            active: true,
            code: code,
            limit: 1,
            expand: ["data.coupon"],
        });

        if (promotionCodes.data.length === 0) {
            return { success: false, error: 'This coupon code is not valid or has expired.' };
        }

        const promoCode = promotionCodes.data[0];
        const coupon = promoCode.coupon;

        if (!coupon.valid) {
             return { success: false, error: 'This coupon code is not valid or has expired.' };
        }
        
        const appliesTo = coupon.metadata.applies_to_plan || 'any';
        if (appliesTo !== 'any' && appliesTo !== plan) {
            return { success: false, error: `This coupon is only valid for the ${appliesTo} plan.` };
        }

        return {
            success: true,
            coupon: {
                id: promoCode.code, // Return the promotion code itself
                name: coupon.name,
                percent_off: coupon.percent_off,
                amount_off: coupon.amount_off,
            },
        };

    } catch (e: any) {
        console.error('Error validating coupon:', e);
        return { success: false, error: 'Could not validate coupon code.' };
    }
}
