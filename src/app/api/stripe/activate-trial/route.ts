
'use server';

import { stripe } from '@/lib/stripe/config';
import { adminDb } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

async function handlePlanActivation(db: any, userId: string, userData: any, interval: 'monthly' | 'yearly') {
    if (!userData.paidBonusGiven) {
        const userRef = db.collection('users').doc(userId);
        const creditHistoryRef = userRef.collection('creditHistory');
        
        await db.runTransaction(async (transaction: any) => {
            transaction.update(userRef, { 
                proposalCredits: FieldValue.increment(10),
                paidBonusGiven: true 
            });
            transaction.set(creditHistoryRef.doc(), {
                amount: 10,
                reason: 'Subscribed to a Pro plan',
                createdAt: FieldValue.serverTimestamp()
            });
        });
    }
}


export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const origin = req.nextUrl.origin;

    if (!sessionId) {
        return NextResponse.redirect(`${origin}/pricing?error=session_id_missing`);
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['setup_intent.payment_method']
        });

        if (session.status !== 'complete') {
            return NextResponse.redirect(`${origin}/pricing?error=setup_incomplete`);
        }

        const setupIntent = session.setup_intent as Stripe.SetupIntent;
        const metadata = setupIntent.metadata;

        if (!metadata || !metadata.subscription_id || !metadata.price_id) {
            throw new Error('Setup intent metadata is missing required fields.');
        }

        const subscriptionId = metadata.subscription_id;
        const priceId = metadata.price_id;
        const couponId = metadata.coupon_id;
        const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethod.id, {
            customer: session.customer as string,
        });

        // Set it as the default for the customer's subscriptions
        await stripe.customers.update(session.customer as string, {
            invoice_settings: {
                default_payment_method: paymentMethod.id,
            },
        });
        
        // Retrieve the subscription to get its current items
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Update the subscription to end the trial and apply the new plan
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            trial_end: 'now',
            cancel_at_period_end: false,
            items: [{
                id: subscription.items.data[0].id,
                price: priceId,
            }],
            proration_behavior: 'none',
            coupon: couponId || undefined,
        });

        // Redirect to a success page
        const interval = updatedSubscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly';
        return NextResponse.redirect(`${origin}/dashboard?subscribed=true&interval=${interval}`);

    } catch (error: any) {
        console.error("Error activating trial:", error);
        return NextResponse.redirect(`${origin}/pricing?error=${encodeURIComponent(error.message)}`);
    }
}

