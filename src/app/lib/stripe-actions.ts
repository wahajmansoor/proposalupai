
'use server';

import { stripe } from '@/lib/stripe/config';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createCheckoutSession() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  const stripeCustomerId = userData?.stripeCustomerId;

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const origin = `${protocol}://${host}`;
  const successUrl = `${origin}/dashboard`;
  const cancelUrl = `${origin}/dashboard/pricing`;
  
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error('Stripe price ID is not configured.');
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!checkoutSession.url) {
    throw new Error('Could not create checkout session');
  }

  redirect(checkoutSession.url);
}

export async function createCustomerPortalSession() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;

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
