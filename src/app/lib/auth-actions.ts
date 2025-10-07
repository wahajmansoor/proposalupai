
'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { getCountryFromIp } from '@/app/lib/location';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
});

export async function signUpWithEmail(input: z.infer<typeof signUpSchema>): Promise<{ error?: string }> {
  try {
    const { email, password, fullName } = signUpSchema.parse(input);

    // 1. Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
    });

    // 2. Create Stripe Customer
    const customer = await stripe.customers.create({
      email: userRecord.email!,
      name: userRecord.displayName || undefined,
      metadata: {
        firebaseUID: userRecord.uid,
      },
    });

    // 3. Get country from IP
    const ip = headers().get('x-forwarded-for');
    const country = await getCountryFromIp(ip);

    // 4. Create user document in Firestore
    const userRef = adminDb.collection('users').doc(userRecord.uid);
    await userRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      createdAt: new Date(),
      stripeCustomerId: customer.id,
      proposalCount: 0, // Initialize proposal count
      subscriptionStatus: null, // New users have no plan by default
      country: country, // Add country data
    });

    return {};

  } catch (error: any) {
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'This email is already in use by another account.';
    } else if (error instanceof z.ZodError) {
        errorMessage = 'Invalid input provided.';
    }
    console.error('Sign-up error:', error);
    return { error: errorMessage };
  }
}
