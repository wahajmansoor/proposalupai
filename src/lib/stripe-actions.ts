
'use server';

import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { FieldValue, type Firestore, type DocumentReference } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { getCurrentUser } from './firebase/server-auth';


// --- Credit Handling Logic ---
export async function addCredits(db: Firestore, userRef: DocumentReference, amount: number, reason: string) {
    const creditHistoryRef = userRef.collection('creditHistory');
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            console.error(`User document ${userRef.id} does not exist. Cannot add credits.`);
            return;
        }
        transaction.update(userRef, {
            proposalCredits: FieldValue.increment(amount)
        });
        transaction.set(creditHistoryRef.doc(), {
            amount: amount,
            reason: reason,
            createdAt: FieldValue.serverTimestamp()
        });
    });
}

// --- Main Stripe Actions ---

export async function handlePlanChange(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  redirectUrl?: string;
  message?: string;
}> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'User not authenticated. Please log in again.' };
  }

  const { user, userDoc } = currentUser;
  
  let interval = formData.get('interval') as 'monthly' | 'yearly' | null;
  const coupon = formData.get('coupon') as string | null;
  const stripeCustomerId = userDoc?.stripeCustomerId;
  const subscriptionStatus = userDoc?.subscriptionStatus;
  const subscriptionId = userDoc?.subscriptionId;
  const currentInterval = userDoc?.subscriptionInterval;

  if (!stripeCustomerId) {
    return { error: 'User is not properly authenticated. Please log in again.' };
  }
  
  if (!interval) {
    interval = 'monthly';
  }

  if (interval !== 'monthly' && interval !== 'yearly') {
    return { error: 'Invalid billing interval selected.' };
  }

  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID!;
  const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID!;
  const priceId = interval === 'yearly' ? yearlyPriceId : monthlyPriceId;

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const origin = `${protocol}://${host}`;
  const successUrl = `${origin}/dashboard?subscribed=true&interval=${interval}`;
  const cancelUrl = `${origin}/onboarding`;

  try {
    const userRef = adminDb.collection('users').doc(user.uid);

    // Scenario 1: New user starting a trial
    if (!subscriptionStatus || subscriptionStatus === 'null' || subscriptionStatus === 'undefined') {
       
        // Prevent awarding trial credits multiple times
        if (!userDoc?.trialCreditsAwarded) {
            let creditsToAward = 5;
            let creditReason = 'Started a new trial';

            // Check for referral
            if (userDoc?.referredBy) {
                const referrerQuery = await adminDb.collection('users').where('referralCode', '==', userDoc.referredBy).limit(1).get();
                if (!referrerQuery.empty) {
                    const referrerRef = referrerQuery.docs[0].ref;
                    // Award 5 credits to the referrer
                    await addCredits(adminDb, referrerRef, 5, `Referral bonus for ${userDoc?.displayName || 'a new user'}`);
                    console.log(`Awarded 5 referral credits to referrer ${referrerRef.id}.`);

                    // New user gets 10 credits total (5 for trial + 5 for referral)
                    creditsToAward = 10;
                    creditReason = 'Started trial with referral bonus';
                }
            }
            
            await addCredits(adminDb, userRef, creditsToAward, creditReason);
            // Mark that trial credits have been given
            await userRef.update({ trialCreditsAwarded: true });
            console.log(`Awarded ${creditsToAward} initial credits to new user ${user.uid}.`);
        }

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId,
            client_reference_id: user.uid,
            success_url: successUrl,
            cancel_url: cancelUrl,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
            subscription_data: {
              trial_period_days: 2,
            },
        };

        if (coupon) {
            sessionParams.discounts = [{ coupon }];
        }

        const session = await stripe.checkout.sessions.create(sessionParams);
        return { redirectUrl: session.url! };
    }
    
    // Scenario 2: User is on a trial and activating a plan
    if (subscriptionStatus === 'trialing' && subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                trial_end: 'now',
                cancel_at_period_end: false,
                items: [{
                    id: subscription.items.data[0].id,
                    price: priceId,
                }],
                proration_behavior: 'create_prorations',
                coupon: coupon || undefined,
            });

            // Directly update Firestore to ensure status is reflected immediately
            await userRef.update({
                subscriptionStatus: 'active',
                subscriptionInterval: updatedSubscription.items.data[0].price.recurring?.interval,
                subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
                lastPrice: updatedSubscription.items.data[0].price.unit_amount ? updatedSubscription.items.data[0].price.unit_amount / 100 : null,
                updatedAt: FieldValue.serverTimestamp(),
            });
            
            // Award initial credits upon first activation
            const planInterval = updatedSubscription.items.data[0].price.recurring?.interval;
            if (planInterval === 'month') {
                await addCredits(adminDb, userRef, 10, 'Monthly plan activation bonus');
            } else if (planInterval === 'year') {
                await addCredits(adminDb, userRef, 100, 'Yearly plan upgrade bonus');
            }

            revalidatePath('/pricing');
            revalidatePath('/subscription');
            return { success: true, message: `Your trial has ended and your ${interval} plan is now active!` };
        } catch (error: any) {
            if (error.code === 'customer_without_payment_method') {
                 // The user started trial without a card, so we need to send them to a checkout page to add one.
                const session = await stripe.checkout.sessions.create({
                    customer: stripeCustomerId,
                    success_url: `${origin}/api/stripe/activate-trial?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: cancelUrl,
                    mode: 'setup',
                    setup_intent_data: {
                        metadata: {
                            subscription_id: subscriptionId,
                            price_id: priceId,
                            coupon_id: coupon || '',
                        }
                    }
                });
                return { redirectUrl: session.url! };
            }
            throw error; // Re-throw other errors
        }
    }


    // Scenario 3: User is on active monthly and upgrading to yearly
    if (subscriptionStatus === 'active' && subscriptionId && currentInterval === 'month' && interval === 'yearly') {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: subscription.items.data[0].id, price: priceId }],
        proration_behavior: 'create_prorations',
        coupon: coupon || undefined,
        cancel_at_period_end: false,
      });

      // Immediately update the database
      await userRef.update({
          subscriptionStatus: 'active',
          subscriptionInterval: 'year',
          subscriptionCurrentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
          lastPrice: updatedSubscription.items.data[0].price.unit_amount ? updatedSubscription.items.data[0].price.unit_amount / 100 : null,
          updatedAt: FieldValue.serverTimestamp(),
      });
      
      // Award the difference in credits for upgrading
      await addCredits(adminDb, userRef, 90, 'Yearly plan upgrade bonus');

      revalidatePath('/pricing');
      revalidatePath('/subscription');
      return { success: true, message: 'Your plan has been successfully switched to Yearly!' };
    }

    // Scenario 4: User had a canceled or failed sub and is reactivating
    if (subscriptionStatus === 'canceled' || subscriptionStatus === 'unpaid' || subscriptionStatus === 'past_due') {
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId,
            client_reference_id: user.uid,
            success_url: successUrl,
            cancel_url: cancelUrl,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
        };

        if (coupon) {
            sessionParams.discounts = [{ coupon }];
        }
        
        const session = await stripe.checkout.sessions.create(sessionParams);
        return { redirectUrl: session.url! };
    }
    
    // Fallback if no specific action is matched (e.g., trying to subscribe to the same plan)
    return { error: 'No valid action could be determined for your subscription state.' };

  } catch (error: any) {
    console.error("Error in handlePlanChange:", error);
    if (error.raw?.message?.includes('not specified for use with this customer')) {
        return { error: 'This coupon code is not valid for your account.' };
    }
    if (error.code === 'coupon_invalid' || error.code === 'promotion_code_invalid' || error.code === 'promotion_code_expired') {
        return { error: 'The provided coupon code is invalid or has expired.' };
    }
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

export async function createCustomerPortalSession(): Promise<{ url?: string; error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: 'User not authenticated. Please log in again.' };
  }

  const { userDoc } = currentUser;
  const stripeCustomerId = userDoc?.stripeCustomerId;

  if (!stripeCustomerId) {
    return { error: 'Stripe customer ID not found for this user.' };
  }

  const headersList = headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
  const returnUrl = `${protocol}://${host}/subscription`;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    if (!portalSession.url) {
      return { error: 'Could not create customer portal session.' };
    }

    return { url: portalSession.url };
  } catch (error: any) {
    console.error('Error creating customer portal session:', error.message);
    if (error.message && error.message.includes('No configuration provided')) {
      return {
        error:
          'Stripe Customer Portal is not configured. Please set it up in your Stripe dashboard at dashboard.stripe.com/test/settings/billing/portal',
      };
    }
    return {
      error:
        'An unexpected error occurred while creating the billing portal session.',
    };
  }
}

const validateCouponSchema = z.object({
  code: z.string(),
  plan: z.enum(['monthly', 'yearly']),
});

export async function validateCouponAction(formData: FormData): Promise<{
    success: boolean;
    error?: string;
    coupon?: {
        id: string;
        name: string | null;
        percent_off: number | null;
        amount_off: number | null;
    };
}> {
  const validatedFields = validateCouponSchema.safeParse({
    code: formData.get('code'),
    plan: formData.get('plan'),
  });

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid coupon code or plan.' };
  }

  const { code, plan } = validatedFields.data;

  try {
    const promotionCodes = await stripe.promotionCodes.list({
      code: code,
      active: true,
      limit: 1,
      expand: ['data.coupon']
    });

    if (promotionCodes.data.length === 0) {
      return { success: false, error: 'This coupon code is invalid or has expired.' };
    }

    const promoCode = promotionCodes.data[0];
    const coupon = promoCode.coupon as Stripe.Coupon;

    if (!coupon.valid) {
        return { success: false, error: 'This coupon is no longer valid.' };
    }

    const appliesToPlan = coupon.metadata?.applies_to_plan;
    if (appliesToPlan && appliesToPlan !== 'any' && appliesToPlan !== plan) {
        return { success: false, error: `This coupon is only valid for the ${appliesToPlan} plan.` };
    }

    return {
      success: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
      },
    };
  } catch (error: any) {
    console.error("Stripe API error validating coupon:", error);
    return { success: false, error: 'Could not validate coupon code.' };
  }
}


const creditPurchaseSchema = z.object({
    priceId: z.string().startsWith('price_'),
});

const creditPackages: Record<string, { amount: number; credits: number, description: string }> = {
    [process.env.NEXT_PUBLIC_STRIPE_CREDITS_10_PRICE_ID!]: { amount: 500, credits: 10, description: "10 Credits" },
    [process.env.NEXT_PUBLIC_STRIPE_CREDITS_25_PRICE_ID!]: { amount: 1000, credits: 25, description: "25 Credits" },
    [process.env.NEXT_PUBLIC_STRIPE_CREDITS_50_PRICE_ID!]: { amount: 2500, credits: 50, description: "50 Credits" }
};

export async function chargeCardForCredits(formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'User not authenticated. Please log in again.' };
  }
  const { user, userDoc } = currentUser;

  const validatedFields = creditPurchaseSchema.safeParse({
    priceId: formData.get('priceId'),
  });

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid credit package selected.' };
  }

  const { priceId } = validatedFields.data;
  const creditPackage = creditPackages[priceId];
  if (!creditPackage) {
      return { success: false, error: 'Invalid credit package selected.' };
  }
  
  try {
    const stripeCustomerId = userDoc?.stripeCustomerId;
    if (!stripeCustomerId) {
        return { success: false, error: 'User does not have a Stripe customer ID.' };
    }
    
    // Find a payment method for the customer
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
        expand: ['invoice_settings.default_payment_method']
    });
    
    let paymentMethodId: string | null = null;
    if (customer.invoice_settings?.default_payment_method) {
        paymentMethodId = typeof customer.invoice_settings.default_payment_method === 'string' 
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings.default_payment_method.id;
    } else {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'card',
        });
        if (paymentMethods.data.length > 0) {
            paymentMethodId = paymentMethods.data[0].id;
        }
    }

    if (!paymentMethodId) {
        return { success: false, error: 'No default payment method on file. Please add a payment method in your billing settings.'};
    }

    // Create and confirm a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.amount,
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Credit Purchase: ${creditPackage.description}`,
      metadata: {
        purchase_type: 'credits',
        firebase_uid: user.uid,
        price_id: priceId,
      },
    });
    
    if (paymentIntent.status === 'succeeded') {
        const userRef = adminDb.collection('users').doc(user.uid);
        const creditsToAdd = creditPackage.credits;
        const reason = `Purchased ${creditsToAdd} credits`;
        
        await addCredits(adminDb, userRef, creditsToAdd, reason);

        const billingHistoryRef = userRef.collection('billingHistory');
        // Use .add() to create a new document with a unique ID
        await billingHistoryRef.add({
            id: paymentIntent.id,
            createdAt: FieldValue.serverTimestamp(),
            date: new Date(paymentIntent.created * 1000),
            total: paymentIntent.amount,
            status: 'succeeded',
            invoiceUrl: null, // Direct charges don't have a hosted invoice URL
            description: `Credit Purchase: ${creditsToAdd} credits`,
        });

        revalidatePath('/subscription');
        return { success: true, message: 'Credit purchase successful!' };
    } else {
        return { success: false, error: 'Payment failed. Please try again or check your payment method.' };
    }

  } catch (error: any) {
    console.error('Error charging card for credits:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during payment.' };
  }
}
