
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

  const { userDoc } = currentUser;
  const stripeCustomerId = userDoc?.stripeCustomerId;

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const origin = `${protocol}://${host}`;
  const successUrl = `${origin}/dashboard`;
  const cancelUrl = `${origin}/dashboard`;
  
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId || priceId.includes('your_stripe_price_id_here')) {
    throw new Error('Stripe Price ID is not configured. Please set it in your environment variables.');
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: stripeCustomerId,
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
        throw new Error('User not authenticated');
    }

    const { userDoc } = currentUser;
    const stripeCustomerId = userDoc?.stripeCustomerId;

    if (!stripeCustomerId) {
        throw new Error('Stripe customer ID not found for user');
    }

    const headersList = headers();
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('host');
    const returnUrl = `${protocol}://${host}/dashboard/profile`;

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
    });

    if (!portalSession.url) {
        throw new Error('Could not create customer portal session');
    }

    redirect(portalSession.url);
}
