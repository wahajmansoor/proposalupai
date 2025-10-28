
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && !value.includes('your_')
);

if (!getApps().length) {
    if (isFirebaseConfigured) {
        app = initializeApp(firebaseConfig);
    } else {
        // Initialize with dummy values if not configured, 
        // to prevent the app from crashing on import.
        // Client-side checks will handle functionality.
        app = initializeApp({ apiKey: "dummy", authDomain: "dummy.firebaseapp.com", projectId: "dummy" });
        console.error(
            'Firebase is not fully configured. Please add your NEXT_PUBLIC_FIREBASE_* variables to your .env file. The app will run without Firebase functionality on the client.'
        );
    }
} else {
    app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);


export { app, db, auth, isFirebaseConfigured };
