
import { createUserWithEmailAndPassword, updateProfile, User, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { stripe } from '@/lib/stripe/config';

export async function signUpUser(fullName: string, email: string, password: string): Promise<User> {
  try {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Update the user's profile in Firebase Auth
    await updateProfile(user, { displayName: fullName });
    
    // 3. Send the verification email
    await sendEmailVerification(user);

    // 4. Create Stripe customer
    const customer = await stripe.customers.create({
        email: user.email!,
        name: fullName,
        metadata: {
            firebaseUID: user.uid,
        },
    });

    // 5. Create user document in Firestore
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
    // Re-throw the error to be caught by the calling function and displayed to the user
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
