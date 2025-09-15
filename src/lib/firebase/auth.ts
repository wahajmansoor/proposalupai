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
import { getFirebaseApp } from './config';

// Initialize the Firebase app
const app = getFirebaseApp();
// Get the Auth service
const auth: Auth = getAuth(app);

// Export the onAuthStateChanged function and User type for use in components
export { onAuthStateChanged, type User };

export const signUpUser = async (email: string, password: string, displayName: string) => {
  let result = null,
    error = null;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's profile in Firebase Auth
    await updateProfile(user, { displayName });
    
    result = userCredential;

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
