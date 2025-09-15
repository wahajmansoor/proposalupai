import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc } from 'firebase/firestore';

export { onAuthStateChanged, type User };

export const signUpUser = async (email: string, password: string, displayName: string) => {
  let result = null,
    error = null;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    result = userCredential;
    const user = userCredential.user;

    // After user is created, update their profile and create a document in Firestore
    await updateProfile(user, { displayName });
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName,
      email,
    });

  } catch (e) {
    error = e;
  }

  return { result, error };
};

export const signInUser = async (email: string, password: string) => {
  let result = null,
    error = null;
  try {
    result = await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    error = e;
  }

  return { result, error };
};

export const signOutUser = () => {
  return signOut(auth);
};
