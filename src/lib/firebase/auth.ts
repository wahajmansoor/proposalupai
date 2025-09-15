import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc } from 'firebase/firestore';

export { onAuthStateChanged, type User };

export const signUpUser = async (email: string, password: string, displayName: string) => {
  let result = null,
    error = null;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
      await updateProfile(result.user, { displayName });
      // Create a document in the 'users' collection
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        displayName,
        email,
      });
    }
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
