
'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/config';
import { cookies } from 'next/headers';

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

    // 3. Create user document in Firestore
    const userRef = adminDb.collection('users').doc(userRecord.uid);
    await userRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      createdAt: new Date(),
      stripeCustomerId: customer.id,
    });

    // 4. Create a session cookie for the user
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    // Note: The custom token needs to be exchanged on the client for an ID token,
    // which is then sent back to create a session.
    // However, since we are in a server action, a simpler approach is to create a session directly.
    // For that, we need an ID token, which we can't get here.
    // The flow will be: sign up -> sign in on client -> create session.
    // For now, we will return success and let the client handle sign-in.
    // A better approach is to create a custom token and send it back to the client.

    // Let's create a session directly. This requires an id token.
    // Since we can't get an ID token on the server directly after user creation,
    // the client will need to sign in and post the id token.
    // The server action will return success, and the client will then sign in.
    
    // An even better flow for Server Actions:
    // Create a custom token, return it to the client. The client signs in with it, gets an ID token, posts it to /api/auth/session.

    const idToken = await adminAuth.createCustomToken(userRecord.uid);
    
    // This is a temporary solution to get an idToken for session creation.
    // In a real app, you'd use a more secure method or the client SDK to sign in.
    // The custom token needs to be exchanged on the client.
    // So we will let the client-side handle the sign-in and session creation.

    // Let's create the session cookie directly.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    // To create a session cookie, we need an ID token. We can't mint one on the server.
    // The established pattern is better:
    // 1. Client sends credentials to server action.
    // 2. Server action creates user.
    // 3. Server action returns success/error.
    // 4. Client then calls Firebase client SDK `signInWithEmailAndPassword`.
    // 5. Client gets ID token, posts it to `/api/auth/session` to create the cookie.

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
