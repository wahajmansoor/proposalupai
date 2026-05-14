
import { NextResponse } from 'next/server';
import { paddle } from '@/lib/paddle/config';
import prisma from '@/lib/prisma';
import { addCreditsAction } from '@/lib/paddle-actions';

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

// Award credits only once per subscription activation to prevent duplicates
async function awardActivationCredits(userId: string, interval: string | undefined, subscriptionId: string) {
    const reason = interval === 'year' ? 'Yearly plan activation' : 'Monthly plan activation';
    const amount = interval === 'year' ? 400 : 30;

    // Check if we already awarded credits for this subscription activation
    const existing = await prisma.creditHistory.findFirst({
        where: { userId, reason },
    });

    if (existing) {
        console.log(`Credits already awarded for user ${userId} (${reason}). Skipping.`);
        return;
    }

    console.log(`Awarding ${amount} credits to user ${userId} for ${reason}`);
    await addCreditsAction(userId, amount, reason);
}

export async function POST(req: Request) {
    console.log('Webhook received!');
    const signature = req.headers.get('paddle-signature') || '';
    const body = await req.text();
    console.log('Webhook body length:', body.length);

    if (!signature || !PADDLE_WEBHOOK_SECRET) {
        console.error('Missing signature or secret');
        return new NextResponse('Missing signature or secret', { status: 400 });
    }

    try {
        // Verify the webhook signature
        const event = await paddle.webhooks.unmarshal(body, PADDLE_WEBHOOK_SECRET, signature);

        if (!event) {
            console.error('Webhook verification failed: Event is null');
            return new NextResponse('Invalid signature', { status: 400 });
        }

        const { eventType, data } = event;
        console.log('Webhook verified. Event type:', eventType);

        switch (eventType) {
            case 'subscription.created': {
                const subscription = data as any;
                const userId = subscription.customData?.userId;
                console.log(`subscription.created: userId=${userId}, status=${subscription.status}`);
                if (userId) {
                    const interval = subscription.items?.[0]?.price?.billingCycle?.interval;
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            paddleCustomerId: subscription.customerId,
                            paddleSubscriptionId: subscription.id,
                            subscriptionStatus: subscription.status,
                            subscriptionInterval: interval,
                            subscriptionCurrentPeriodEnd: subscription.currentBillingPeriod ? new Date(subscription.currentBillingPeriod.endsAt) : null,
                        } as any
                    });

                    // Award credits immediately if activated (not trialing)
                    if (subscription.status === 'active') {
                        await awardActivationCredits(userId, interval, subscription.id);
                    }
                } else {
                    console.error('subscription.created: No userId in customData!', JSON.stringify(subscription.customData));
                }
                break;
            }

            case 'subscription.updated': {
                const subscription = data as any;
                const userId = subscription.customData?.userId;
                console.log(`subscription.updated: userId=${userId}, status=${subscription.status}`);
                if (userId) {
                    // Fetch previous status to detect trialing → active transition
                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { subscriptionStatus: true } as any,
                    }) as any;
                    const previousStatus = dbUser?.subscriptionStatus;

                    const interval = subscription.items?.[0]?.price?.billingCycle?.interval;
                    const scheduledCancel = subscription.scheduledChange?.action === 'cancel'
                        ? new Date(subscription.scheduledChange.effectiveAt)
                        : null;

                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            paddleCustomerId: subscription.customerId || undefined,
                            paddleSubscriptionId: subscription.id || undefined,
                            subscriptionStatus: subscription.status,
                            subscriptionInterval: interval,
                            subscriptionCurrentPeriodEnd: subscription.currentBillingPeriod
                                ? new Date(subscription.currentBillingPeriod.endsAt)
                                : null,
                            ...(scheduledCancel !== undefined && { scheduledCancelAt: scheduledCancel }),
                        } as any
                    });

                    // Award credits when trial converts to active paid plan
                    if (subscription.status === 'active' && previousStatus !== 'active') {
                        console.log(`Trial converted to active for user ${userId}. Awarding credits.`);
                        await awardActivationCredits(userId, interval, subscription.id);
                    }
                } else {
                    console.error('subscription.updated: No userId in customData!', JSON.stringify(subscription.customData));
                }
                break;
            }

            case 'subscription.activated': {
                const subscription = data as any;
                const userId = subscription.customData?.userId;
                console.log(`subscription.activated: userId=${userId}`);
                if (userId) {
                    const interval = subscription.items?.[0]?.price?.billingCycle?.interval;
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            paddleCustomerId: subscription.customerId || undefined,
                            paddleSubscriptionId: subscription.id || undefined,
                            subscriptionStatus: 'active',
                            subscriptionInterval: interval,
                            subscriptionCurrentPeriodEnd: subscription.currentBillingPeriod ? new Date(subscription.currentBillingPeriod.endsAt) : null,
                        } as any
                    });
                    await awardActivationCredits(userId, interval, subscription.id);
                } else {
                    console.error('subscription.activated: No userId in customData!', JSON.stringify(subscription.customData));
                }
                break;
            }

            case 'subscription.canceled': {
                const subscription = data;
                const userId = subscription.customData?.userId;
                if (userId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            subscriptionStatus: 'canceled',
                            scheduledCancelAt: null,
                        } as any
                    });
                }
                break;
            }

            case 'transaction.completed': {
                // Handle one-time purchases (credits)
                const transaction = data;
                const userId = transaction.customData?.userId;
                const purchaseType = transaction.customData?.purchaseType;

                if (userId && purchaseType === 'credits') {
                    const priceId = transaction.items[0]?.price?.id;
                    // We can map priceId to credit amount here or use customData
                    const creditAmount = transaction.customData?.creditAmount || 0;
                    if (creditAmount > 0) {
                        await addCreditsAction(userId, Number(creditAmount), 'Credit purchase');
                    }
                }
                console.log('Transaction completed for user:', userId);
                break;
            }

            default:
                console.log('Unhandled event type:', eventType);
        }

        return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error('Webhook verification failed:', err);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }
}
