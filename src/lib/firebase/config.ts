import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let db;
let auth;

// Check if all Firebase config values are provided
const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && !value.includes('your_')
);

if (isFirebaseConfigured) {
  // Initialize Firebase for SSR
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  console.error(
    'Firebase is not fully configured. Please add your NEXT_PUBLIC_FIREBASE_* variables to your .env file. The app will run without Firebase functionality on the client.'
  );
}


export { app, db, auth };
