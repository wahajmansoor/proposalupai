import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  Auth,
} from 'firebase/auth';
import { app } from './config';

export const auth: Auth = getAuth(app);

export const signUpUser = async (email: string, password: string, displayName: string) => {
  let result = null,
    error = null;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
      await updateProfile(result.user, { displayName });
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

    