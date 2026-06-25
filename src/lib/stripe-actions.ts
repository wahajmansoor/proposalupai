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

export async function syncUserSubscription() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.stripeCustomerId) {
      return { success: false, message: 'No Stripe customer associated yet.' };
    }

    // List all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return { success: false, message: 'No subscriptions found in Stripe.' };
    }

    const subscription = subscriptions.data[0];
    const periodEndRaw = (subscription as any).current_period_end 
      || subscription.items.data[0]?.current_period_end 
      || (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
    const periodEndDate = new Date(periodEndRaw * 1000);

    // If subscription is already in sync, skip the DB update and return success: false
    if (
      user.stripeSubscriptionId === subscription.id &&
      user.subscriptionStatus === subscription.status &&
      user.stripePriceId === subscription.items.data[0].price.id
    ) {
      return { success: false, message: 'Already in sync' };
    }

    const priceId = subscription.items.data[0].price.id;
    const isNewActivation = user.subscriptionStatus !== 'active' && subscription.status === 'active';
    let creditsToAdd = 0;

    if (isNewActivation) {
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) {
        creditsToAdd = 30;
      } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID) {
        creditsToAdd = 400;
      }
    }

    // Update database with latest subscription status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        stripePriceId: priceId,
        subscriptionCurrentPeriodEnd: periodEndDate,
        subscriptionInterval: subscription.items.data[0].plan.interval,
        ...(creditsToAdd > 0 ? {
          proposalCredits: { increment: creditsToAdd }
        } : {})
      },
    });

    if (isNewActivation && creditsToAdd > 0) {
      await prisma.creditHistory.create({
        data: {
          userId: user.id,
          amount: creditsToAdd,
          reason: `Pro Plan Activation (${subscription.items.data[0].plan.interval === 'year' ? 'Yearly' : 'Monthly'})`,
        }
      });
    }

    return {
      success: true,
      subscriptionStatus: updatedUser.subscriptionStatus,
    };
  } catch (error: any) {
    console.error('Error syncing subscription status:', error);
    return { error: error.message };
  }
}

export async function updateSubscriptionPlan(newPriceId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.stripeSubscriptionId) {
      return { error: 'No active subscription found to upgrade' };
    }

    // Retrieve active subscription details
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    // Update subscription item to new Price ID
    const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice', // Charge difference immediately
      payment_behavior: 'error_if_incomplete',
    });

    const periodEndRaw = (updatedSubscription as any).current_period_end 
      || updatedSubscription.items.data[0]?.current_period_end 
      || (Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
    const periodEndDate = new Date(periodEndRaw * 1000);

    const creditsToAdd = 400; // Since they are upgrading to Yearly

    // Update user subscription details and award credits
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripePriceId: newPriceId,
        subscriptionStatus: updatedSubscription.status,
        subscriptionCurrentPeriodEnd: periodEndDate,
        subscriptionInterval: updatedSubscription.items.data[0].plan.interval,
        proposalCredits: { increment: creditsToAdd },
      },
    });

    // Log the credit award
    await prisma.creditHistory.create({
      data: {
        userId: user.id,
        amount: creditsToAdd,
        reason: `Pro Plan Upgrade (Yearly)`,
      },
    });

    revalidatePath('/subscription');

    return {
      success: true,
      subscriptionStatus: updatedUser.subscriptionStatus,
      proposalCredits: updatedUser.proposalCredits,
    };
  } catch (error: any) {
    console.error('Error upgrading subscription plan:', error);
    return { error: error.message };
  }
}

export async function buyCreditsDirectly(priceId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.stripeCustomerId) {
      return { fallback: true };
    }

    // List payment methods for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    if (paymentMethods.data.length === 0) {
      return { fallback: true };
    }

    // Retrieve price details to know the amount and currency
    const price = await stripe.prices.retrieve(priceId);
    if (!price || !price.unit_amount) {
      return { error: 'Invalid price configuration' };
    }

    // Charge the card immediately using paymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency || 'usd',
      customer: user.stripeCustomerId,
      payment_method: paymentMethods.data[0].id,
      off_session: true,
      confirm: true,
    });

    if (paymentIntent.status !== 'succeeded') {
      return { error: `Payment failed with status: ${paymentIntent.status}` };
    }

    // Determine credits to add
    let creditsToAdd = 0;
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_CREDITS_30_PRICE_ID) {
      creditsToAdd = 30;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_CREDITS_70_PRICE_ID) {
      creditsToAdd = 70;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_CREDITS_200_PRICE_ID) {
      creditsToAdd = 200;
    }

    if (creditsToAdd === 0) {
      return { error: 'Invalid price configuration for credits' };
    }

    // Increment user credits
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        proposalCredits: { increment: creditsToAdd },
      },
    });

    // Record credit transaction history
    await prisma.creditHistory.create({
      data: {
        userId: user.id,
        amount: creditsToAdd,
        reason: 'Credit Purchase',
      },
    });

    revalidatePath('/subscription');

    return {
      success: true,
      proposalCredits: updatedUser.proposalCredits,
    };
  } catch (error: any) {
    console.error('Error buying credits directly:', error);
    return { error: error.message };
  }
}
