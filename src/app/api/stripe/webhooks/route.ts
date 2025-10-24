
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
                        };

                        await userRef.update(subscriptionData);
                        console.log(`Successfully synced new subscription for user ${userRef.id}`);
                    }
                } else if (session.mode === 'payment') {
                    const paymentIntentId = session.payment_intent as string;
                    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                    const purchaseType = paymentIntent.metadata.purchase_type;

                    if (purchaseType === 'credits') {
                        const userId = paymentIntent.metadata.firebase_uid;
                        const priceId = paymentIntent.metadata.price_id;
                        const creditsToAdd = creditProducts[priceId];
                        
                        if (userId && creditsToAdd) {
                           const userRef = adminDb.collection('users').doc(userId);
                           await addCredits(adminDb, userRef, creditsToAdd, `Purchased ${creditsToAdd} credits`);
                           console.log(`Added ${creditsToAdd} credits to user ${userId}`);
                        }
                    }
                } else if (session.mode === 'setup') {
                    // This is a trial activation. The actual credit award is handled in `customer.subscription.created`.
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

                if (userRef_invoice && invoice.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
                    const interval = subscription.items.data[0]?.price.recurring?.interval;
                    
                     // Award initial credits if this is the first payment after a trial
                    if (invoice.billing_reason === 'subscription_create') {
                        if (interval === 'month') {
                            await addCredits(adminDb, userRef_invoice, 10, 'Monthly plan activation bonus');
                            console.log(`Added 10 initial monthly credits to user ${userRef_invoice.id}`);
                        } else if (interval === 'year') {
                            await addCredits(adminDb, userRef_invoice, 100, 'Yearly plan activation bonus');
                            console.log(`Added 100 initial yearly credits to user ${userRef_invoice.id}`);
                        }
                    }
                    // Award renewal credits
                    else if (invoice.billing_reason === 'subscription_cycle') {
                        if (interval === 'month') {
                            await addCredits(adminDb, userRef_invoice, 10, 'Monthly subscription credits');
                            console.log(`Added 10 monthly credits to user ${userRef_invoice.id}`);
                        } else if (interval === 'year') {
                            await addCredits(adminDb, userRef_invoice, 100, 'Yearly subscription credits');
                             console.log(`Added 100 yearly credits to user ${userRef_invoice.id}`);
                        }
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
