import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// This file contains the client-side Firebase configuration.
// It is safe to expose this information in the browser.
export const firebaseConfig = {
  apiKey: "AIzaSyCeIQXbVxd2Yhyk9bPMkeNxRspRLRQNOj4",
  authDomain: "studio-8937369223-221cd.firebaseapp.com",
  projectId: "studio-8937369223-221cd",
  storageBucket: "studio-8937369223-221cd.firebasestorage.app",
  messagingSenderId: "791256189022",
  appId: "1:791256189022:web:212affb37fb34165d14ccf",
};

// Initialize Firebase for client-side using a singleton pattern
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
