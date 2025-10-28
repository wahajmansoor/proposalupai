
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { FieldValue, type Firestore, type DocumentReference } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { addCredits } from '@/lib/stripe-actions';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function findUserByStripeCustomerId(db: Firestore, stripeCustomerId: string): Promise<DocumentReference | null> {
    if (!stripeCustomerId) {
        console.warn(`Webhook Warning: Stripe customer ID is missing.`);
        return null;
    }
    const userQuery = await db.collection('users').where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
    if (userQuery.empty) {
        console.warn(`Webhook Warning: No user found with Stripe customer ID ${stripeCustomerId}`);
        return null;
    }
    return userQuery.docs[0].ref;
}


const creditProducts: Record<string, number> = {
    [process.env.NEXT_PUBLIC_STRIPE_CREDITS_10_PRICE_ID!]: 10,
    [process.env.NEXT_PUBLIC_STRIPE_CREDITS_25_PRICE_ID!]: 25,
    [process.env.NEXT_PUBLIC_STRIPE_CREDITS_50_PRICE_ID!]: 50,
};

export async function POST(req: Request) {
    const body = await req.text();
    const sig = headers().get('stripe-signature');

    if (!webhookSecret) {
        console.error('Stripe webhook secret is not set.');
        return new NextResponse('Webhook secret not configured.', { status: 500 });
    }
    if (!sig) {
        console.error('Missing stripe-signature header.');
        return new NextResponse('Missing stripe-signature header.', { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                
                if (session.mode === 'subscription') {
                    const stripeCustomerId = session.customer as string;
                    const userRef = await findUserByStripeCustomerId(adminDb, stripeCustomerId);
                    
                    if (userRef) {
                        const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
                           expand: ['items.data.price'],
                        });
                        const price = subscription.items.data[0]?.price;

                        const subscriptionData = {
                            subscriptionId: subscription.id,
                            subscriptionStatus: subscription.status,
                            subscriptionInterval: price?.recurring?.interval,
                            subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                            lastPrice: price?.unit_amount ? price.unit_amount / 100 : null,
                            updatedAt: FieldValue.serverTimestamp(),
                            onboardingComplete: true, // Mark onboarding as complete
                        };

                        await userRef.update(subscriptionData);
                        console.log(`Successfully synced new subscription for user ${userRef.id}`);
                    }
                } else if (session.mode === 'payment') {
                    // This is handled by invoice.payment_succeeded to catch all one-time payments that generate an invoice
                } else if (session.mode === 'setup') {
                     const stripeCustomerId = session.customer as string;
                     const userRef = await findUserByStripeCustomerId(adminDb, stripeCustomerId);
                     if (userRef) {
                        await userRef.update({ onboardingComplete: true });
                        console.log(`User ${userRef.id} completed onboarding via setup intent.`);
                     }
                }
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId = subscription.customer as string;
                const userRef = await findUserByStripeCustomerId(adminDb, stripeCustomerId);

                if (userRef) {
                     let newStatus = subscription.status;
                     if (subscription.cancel_at_period_end) {
                        newStatus = 'canceled';
                     }
                    
                    const price = subscription.items.data[0]?.price;

                    const subscriptionData: { [key: string]: any } = {
                        subscriptionId: subscription.id,
                        subscriptionStatus: newStatus,
                        subscriptionInterval: price?.recurring?.interval,
                        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        lastPrice: price?.unit_amount ? price.unit_amount / 100 : null,
                        updatedAt: FieldValue.serverTimestamp(),
                    };
                    
                    if(newStatus === 'active' || newStatus === 'trialing') {
                        subscriptionData.onboardingComplete = true;
                    }

                    await userRef.update(subscriptionData);
                    console.log(`Successfully synced subscription for user ${userRef.id}. New status: ${newStatus}`);
                }
                break;
            }
                  
            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId_deleted = deletedSubscription.customer as string;
                const userRef_deleted = await findUserByStripeCustomerId(adminDb, stripeCustomerId_deleted);

                if (userRef_deleted) {
                    await userRef_deleted.update({
                        subscriptionStatus: 'canceled',
                        subscriptionInterval: null, 
                    });
                     console.log(`Successfully marked subscription as canceled for user ${userRef_deleted.id}.`);
                }
                break;
                
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const stripeCustomerId_invoice = invoice.customer as string;
                const userRef_invoice = await findUserByStripeCustomerId(adminDb, stripeCustomerId_invoice);

                if (userRef_invoice) {
                    const firstLineItem = invoice.lines.data[0];
                    const isCreditPurchase = firstLineItem?.price?.id && creditProducts[firstLineItem.price.id];

                    if (isCreditPurchase) {
                        // This path handles credit pack purchases made via a Checkout Session (one-time invoice)
                        const creditsToAdd = creditProducts[firstLineItem.price!.id];
                        await addCredits(adminDb, userRef_invoice, creditsToAdd, `Purchased ${creditsToAdd} credits`);
                        
                        const creditBillingHistoryRef = userRef_invoice.collection('creditBillingHistory').doc(invoice.id);
                         await creditBillingHistoryRef.set({
                            id: invoice.id,
                            createdAt: FieldValue.serverTimestamp(),
                            date: new Date(invoice.created * 1000),
                            total: invoice.total,
                            status: invoice.status,
                            invoiceUrl: invoice.hosted_invoice_url,
                            description: `Credit Purchase: ${creditsToAdd} credits`,
                        });

                    } else {
                        // This path handles all subscription-related invoices.
                        const planBillingHistoryRef = userRef_invoice.collection('planBillingHistory').doc(invoice.id);
                        
                        let description = firstLineItem?.description || 'Payment';
                        const isUpgrade = invoice.lines.data.some(line => line.proration && line.description?.toLowerCase().includes('unused time'));
                        if (isUpgrade) {
                            description = `Upgrade to Yearly Plan`;
                        }

                        await planBillingHistoryRef.set({
                            id: invoice.id,
                            createdAt: FieldValue.serverTimestamp(),
                            date: new Date(invoice.created * 1000),
                            total: invoice.total,
                            status: invoice.status,
                            invoiceUrl: invoice.hosted_invoice_url,
                            description: description,
                        });

                        // Award credits only on subscription creation or renewal
                        if (invoice.subscription) {
                            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
                            const interval = subscription.items.data[0]?.price.recurring?.interval;
                            
                            if (invoice.billing_reason === 'subscription_create') {
                                if (interval === 'month') {
                                    await addCredits(adminDb, userRef_invoice, 10, 'Monthly plan activation bonus');
                                } else if (interval === 'year') {
                                    await addCredits(adminDb, userRef_invoice, 100, 'Yearly plan activation bonus');
                                }
                            } else if (invoice.billing_reason === 'subscription_cycle') {
                                if (interval === 'month') {
                                    await addCredits(adminDb, userRef_invoice, 10, 'Monthly subscription credits');
                                } else if (interval === 'year') {
                                    await addCredits(adminDb, userRef_invoice, 100, 'Yearly subscription credits');
                                }
                            }
                        }
                    }
                }
                break;
            }

            case 'charge.succeeded': {
                // This handler is now a fallback for one-time credit purchases initiated via direct charges (not checkout)
                const charge = event.data.object as Stripe.Charge;
                const purchaseType = charge.metadata.purchase_type;
                
                // Ensure it's a credit purchase and not part of a subscription invoice to prevent double-counting.
                if (purchaseType === 'credits' && !charge.invoice) {
                    const userId = charge.metadata.firebase_uid;
                    const priceId = charge.metadata.price_id;
                    const creditsToAdd = creditProducts[priceId];

                    if (userId && creditsToAdd) {
                       const userRef = adminDb.collection('users').doc(userId);
                       await addCredits(adminDb, userRef, creditsToAdd, `Purchased ${creditsToAdd} credits`);
                       console.log(`Added ${creditsToAdd} credits to user ${userId} via direct charge.`);

                        const billingHistoryRef = userRef.collection('creditBillingHistory').doc(charge.id);
                        await billingHistoryRef.set({
                            id: charge.id,
                            createdAt: FieldValue.serverTimestamp(),
                            date: new Date(charge.created * 1000),
                            total: charge.amount,
                            status: 'succeeded',
                            invoiceUrl: null, // Direct charges don't have a hosted invoice URL
                            description: `Credit Purchase: ${creditsToAdd} credits`,
                        });
                        console.log(`Saved direct credit purchase to billing history for user ${userId}`);
                    }
                }
                break;
            }


            case 'coupon.created':
            case 'coupon.deleted':
            case 'coupon.updated':
                revalidatePath('/admin-portal/coupons');
                console.log(`Coupon event received: ${event.type}`);
                break;
            
            default:
                // Unhandled event type
        }
    } catch (error: any) {
        console.error(`Webhook handler failed for event type ${event.type}. Error: ${error.message}`);
        return new NextResponse('Webhook handler failed.', { status: 500 });
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}
