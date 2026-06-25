import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        let userId = session.metadata?.userId;
        const purchaseType = session.metadata?.purchaseType || (session.mode === 'subscription' ? 'subscription' : 'credits');

        // Robust user lookup if userId is missing from metadata
        if (!userId) {
          if (session.customer) {
            const userByCustomer = await prisma.user.findFirst({
              where: { stripeCustomerId: session.customer as string }
            });
            if (userByCustomer) userId = userByCustomer.id;
          }
          if (!userId && session.customer_details?.email) {
            const userByEmail = await prisma.user.findUnique({
              where: { email: session.customer_details.email.toLowerCase() }
            });
            if (userByEmail) userId = userByEmail.id;
          }
        }

        if (purchaseType === 'credits') {
          const creditAmount = parseInt(session.metadata?.creditAmount || '0', 10);
          if (userId && creditAmount > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                proposalCredits: { increment: creditAmount }
              }
            });
            await prisma.creditHistory.create({
              data: {
                userId,
                amount: creditAmount,
                reason: 'Credit Purchase',
              }
            });
          }
        } else if (purchaseType === 'subscription') {
           const subscriptionId = session.subscription as string;
           const customerId = session.customer as string;
           const subscription = await stripe.subscriptions.retrieve(subscriptionId);
           
           if (userId) {
              await prisma.user.update({
                where: { id: userId },
                data: {
                  stripeSubscriptionId: subscriptionId,
                  stripeCustomerId: customerId,
                  subscriptionStatus: subscription.status,
                  stripePriceId: subscription.items.data[0].price.id,
                  // @ts-ignore
                  subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  subscriptionInterval: subscription.items.data[0].plan.interval,
                }
              });
           }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: subscription.status,
            stripePriceId: subscription.items.data[0].price.id,
            // @ts-ignore
            subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            subscriptionInterval: subscription.items.data[0].plan.interval,
            scheduledCancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
          }
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: 'canceled',
          }
        });
        break;
      }

      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
