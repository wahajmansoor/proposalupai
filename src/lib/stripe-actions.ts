
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
    // This will redirect to login if the user is not found, which is a safe fallback.
    return redirect('/login');
  }

  const { user, userDoc } = currentUser;
  const stripeCustomerId = userDoc.stripeCustomerId;
  const subscriptionStatus = userDoc.subscriptionStatus;
  // Safely get proposalCount, defaulting to 0 if it doesn't exist.
  const proposalCount = userDoc.proposalCount ?? 0;


  if (!stripeCustomerId) {
    // This is a critical error and should not happen for a logged-in user.
    // We can throw an error to be caught by an error boundary or log it.
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

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};

  // If user is currently in a trial, end it immediately upon activation.
  if (subscriptionStatus === 'trialing') {
    subscriptionData.trial_end = 'now';
  } 
  // A new user (not active) gets a free trial if they haven't used up their free proposals.
  else if (subscriptionStatus !== 'active' && proposalCount < 5) {
    subscriptionData.trial_period_days = 2;
  }

  let checkoutSession: Stripe.Checkout.Session;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: user.uid,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    // You could redirect to an error page or show a toast message on the client
    // For now, we'll throw, which will be caught by Next.js's error handling.
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
