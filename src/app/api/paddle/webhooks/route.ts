
import { NextResponse } from 'next/server';
import { paddle } from '@/lib/paddle/config';
import prisma from '@/lib/prisma';
import { addCreditsAction } from '@/lib/paddle-actions';

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

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
                const subscription = data;
                const userId = subscription.customData?.userId;
                if (userId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            paddleCustomerId: subscription.customerId,
                            paddleSubscriptionId: subscription.id,
                            subscriptionStatus: subscription.status,
                            subscriptionInterval: subscription.items[0]?.price?.billingCycle?.interval,
                            subscriptionCurrentPeriodEnd: subscription.currentBillingPeriod ? new Date(subscription.currentBillingPeriod.endsAt) : null,
                        } as any
                    });

                    // Award initial credits
                    const interval = subscription.items[0]?.price?.billingCycle?.interval;
                    if (interval === 'month') {
                        await addCreditsAction(userId, 30, 'Monthly plan activation');
                    } else if (interval === 'year') {
                        await addCreditsAction(userId, 400, 'Yearly plan activation');
                    }
                }
                break;
            }

            case 'subscription.updated': {
                const subscription = data as any;
                const userId = subscription.customData?.userId;
                if (userId) {
                    // Detect scheduled cancellation: status stays 'active' but scheduledChange.action = 'cancel'
                    const scheduledCancel = subscription.scheduledChange?.action === 'cancel'
                        ? new Date(subscription.scheduledChange.effectiveAt)
                        : null;

                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            subscriptionStatus: subscription.status,
                            subscriptionInterval: subscription.items?.[0]?.price?.billingCycle?.interval,
                            subscriptionCurrentPeriodEnd: subscription.currentBillingPeriod
                                ? new Date(subscription.currentBillingPeriod.endsAt)
                                : null,
                            // Store the scheduled cancellation date if present
                            ...(scheduledCancel !== undefined && { scheduledCancelAt: scheduledCancel }),
                        } as any
                    });
                }
                break;
            }

            case 'subscription.activated': {
                // Similar to created/updated, ensure status is active
                const subscription = data;
                const userId = subscription.customData?.userId;
                if (userId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            subscriptionStatus: 'active',
                            subscriptionInterval: subscription.items[0]?.price?.billingCycle?.interval,
                            subscriptionCurrentPeriodEnd: subscription.currentBillingPeriod ? new Date(subscription.currentBillingPeriod.endsAt) : null,
                        } as any
                    });
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
