"use server";

import { stripe } from './stripe';
import { auth } from '@/auth';
import prisma from './prisma';
import { revalidatePath } from 'next/cache';

export async function createStripeCheckoutSession(priceId: string, customData?: Record<string, any>) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: 'User not found' };
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: customData?.purchaseType === 'credits' ? 'payment' : 'subscription',
      success_url: `${appUrl}/subscription?success=true`,
      cancel_url: `${appUrl}/subscription?canceled=true`,
      metadata: {
        userId: user.id,
        ...customData,
      },
    });

    return { url: checkoutSession.url };
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return { error: error.message };
  }
}

export async function createStripePortalSession() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.stripeCustomerId) {
      return { error: 'No Stripe customer ID found' };
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/subscription`,
    });

    return { url: portalSession.url };
  } catch (error: any) {
    console.error('Error creating Stripe portal session:', error);
    return { error: error.message };
  }
}
