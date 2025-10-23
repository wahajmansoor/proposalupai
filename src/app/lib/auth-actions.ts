
'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/config';
import { headers } from 'next/headers';
import { getCountryFromIp } from '@/app/lib/location';
import { FieldValue } from 'firebase-admin/firestore';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  referralCode: z.string().optional(),
});

export async function signUpWithEmail(input: z.infer<typeof signUpSchema>): Promise<{ error?: string }> {
  // Critical check: Ensure admin SDK is initialized before proceeding.
  if (!adminAuth || !adminDb) {
    console.error("Firebase Admin not initialized. Sign-up cannot proceed.");
    return { error: "Server is not configured for authentication. Please contact support." };
  }

  try {
    const { email, password, fullName, referralCode } = signUpSchema.parse(input);

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
    const userData: { [key: string]: any } = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      createdAt: new Date(),
      stripeCustomerId: customer.id,
      proposalCount: 0,
      subscriptionStatus: null,
      country: country,
      referralCode: userRecord.uid.substring(0, 8), // Generate and store referral code
      proposalCredits: 0, // All new users start with 0 credits
    };

    if (referralCode) {
      userData.referredBy = referralCode;
    }

    await userRef.set(userData);

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
