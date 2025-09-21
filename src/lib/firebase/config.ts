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

// Validate the Firebase config
for (const [key, value] of Object.entries(firebaseConfig)) {
    if (!value || value.includes('your_')) {
        const errorMessage = `Missing or invalid Firebase config value for ${key} in .env.local. Please check your Firebase project settings.`;
        // Only throw an error on the server-side to prevent app crash during build/dev
        if (typeof window === 'undefined') {
            throw new Error(errorMessage);
        } else {
            // Log a prominent error in the browser console
            console.error(errorMessage);
        }
    }
}


// Initialize Firebase for SSR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
