
import { createUserWithEmailAndPassword, updateProfile, User, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { stripe } from '@/lib/stripe/config';

export async function signUpUser(fullName: string, email: string, password: string): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: fullName });
    
    // Defer the email verification sending to allow other processes to complete
    sendEmailVerification(user);

    // This function now primarily handles Auth user creation and profile update.
    // The critical Firestore and Stripe creation is handled server-side via the Google sign-in flow,
    // which we will now replicate for email sign-up.
    // For now, to unblock email signup, we'll create the Firestore doc here.
    // NOTE: A more robust solution would be to trigger a server-side function on user creation.

    const customer = await stripe.customers.create({
        email: user.email!,
        name: fullName,
        metadata: {
            firebaseUID: user.uid,
        },
    });

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: fullName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      stripeCustomerId: customer.id,
    });
    
    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}
