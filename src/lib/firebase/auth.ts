import { createUserWithEmailAndPassword, updateProfile, User, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 2); // 2-day trial

    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: fullName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      stripeCustomerId: customer.id,
      trialEndDate: trialEndDate,
    });

    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    // Re-throw the error to be caught by the calling function and displayed to the user
    throw error;
  }
}

export async function updateUserProfile(user: User, profileData: { displayName?: string; photoURL?: string }) {
  if (!user) throw new Error('You must be logged in to update your profile.');

  try {
    // Update Firebase Auth profile
    await updateProfile(user, profileData);

    // Update Firestore user document
    const userRef = doc(db, 'users', user.uid);
    const dataToUpdate: { displayName?: string; photoURL?: string } = {};
    if (profileData.displayName) {
      dataToUpdate.displayName = profileData.displayName;
    }
     if (profileData.photoURL) {
      dataToUpdate.photoURL = profileData.photoURL;
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await setDoc(userRef, dataToUpdate, { merge: true });
    }
  } catch (error) {
     console.error("Error updating profile:", error);
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
