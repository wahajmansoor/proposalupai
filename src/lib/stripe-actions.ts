
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/firebase/server-auth';
import { z } from 'zod';
import type Stripe from 'stripe';

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
  const stripeCustomerId = userDoc.stripeCustomerId;
  const subscriptionStatus = userDoc.subscriptionStatus;
  const subscriptionId = userDoc.subscriptionId;
  const proposalCount = userDoc.proposalCount ?? 0;

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
  };

  if (subscriptionStatus === 'trialing' && subscriptionId) {
    // Logic to UPDATE an existing subscription (end the trial)
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    sessionParams.mode = 'setup';
    sessionParams.setup_intent_data = {
      metadata: {
        subscription_id: subscriptionId,
        price_id: priceId,
      },
    };
    // Redirect to billing portal to update subscription
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: successUrl,
        flow_data: {
            type: 'subscription_update',
            subscription_update: {
                subscription: subscriptionId,
                items: [{
                    id: subscription.items.data[0].id,
                    price: priceId,
                }],
                proration_behavior: 'none',
            },
        },
    });
    redirect(portalSession.url);

  } else {
    // Logic to create a NEW subscription
    sessionParams.mode = 'subscription';
    sessionParams.line_items = [{ price: priceId, quantity: 1 }];

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};
    if (subscriptionStatus !== 'active' && proposalCount < 5) {
      subscriptionData.trial_period_days = 2;
    }
    sessionParams.subscription_data = subscriptionData;
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
