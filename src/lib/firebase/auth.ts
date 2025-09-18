import { createUserWithEmailAndPassword, updateProfile, User, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

export async function signUpUser(fullName: string, email: string, password: string): Promise<User> {
  try {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Update the user's profile in Firebase Auth
    await updateProfile(user, { displayName: fullName });

    // 3. Create user document in Firestore *after* auth profile is updated
    // This ensures displayName is not null and uses the correct server timestamp
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: fullName, // Use the provided fullName directly
      photoURL: user.photoURL,
      createdAt: serverTimestamp(), // Use serverTimestamp for consistency
    });

    return user;
  } catch (error) {
    console.error("Error signing up:", error);
    // Re-throw the error to be caught by the calling function and displayed to the user
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document already exists
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // Create user document in Firestore for new Google sign-in
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
      });
    }
    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
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
