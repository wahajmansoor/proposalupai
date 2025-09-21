
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/firebase/server-auth';

export async function createCheckoutSession() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  const { user, userDoc } = currentUser;
  const stripeCustomerId = userDoc?.stripeCustomerId;

  if (!stripeCustomerId) {
      throw new Error('Could not find Stripe customer ID. Please contact support.');
  }

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const origin = `${protocol}://${host}`;
  const successUrl = `${origin}/dashboard`;
  const cancelUrl = `${origin}/pricing`;
  
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId || priceId.includes('your_stripe_price_id_here')) {
    throw new Error('Stripe Price ID is not configured. Please set it in your environment variables.');
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: stripeCustomerId,
    client_reference_id: user.uid, // Add user's UID to the session
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
        trial_period_days: 2,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!checkoutSession.url) {
    throw new Error('Could not create checkout session');
  }

  redirect(checkoutSession.url);
}

export async function createCustomerPortalSession() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        throw new Error('User not authenticated. Please log in again.');
    }

    const { userDoc } = currentUser;
    const stripeCustomerId = userDoc?.stripeCustomerId;

    if (!stripeCustomerId) {
        throw new Error('Stripe customer ID not found for this user.');
    }

    const headersList = headers();
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('host');
    const returnUrl = `${protocol}://${host}/profile`;

    let portalSession;
    try {
        portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl,
        });

        if (!portalSession.url) {
            throw new Error('Could not create customer portal session.');
        }
    } catch (error: any) {
        console.error("Error creating customer portal session:", error.message);
        if (error.message && error.message.includes('No configuration provided')) {
            throw new Error('Stripe Customer Portal is not configured. Please set it up in your Stripe dashboard at dashboard.stripe.com/test/settings/billing/portal');
        }
        throw new Error(error.message || 'An unexpected error occurred while creating the billing portal session.');
    }
    
    redirect(portalSession.url);
}
