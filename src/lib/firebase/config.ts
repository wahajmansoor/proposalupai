import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace the placeholder values with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCeIQXbVxd2Yhyk9bPMkeNxRspRLRQNOj4",
  authDomain: "studio-8937369223-221cd.firebaseapp.com",
  projectId: "studio-8937369223-221cd",
  storageBucket: "studio-8937369223-221cd.firebasestorage.app",
  messagingSenderId: "791256189022",
  appId: "1:791256189022:web:212affb37fb34165d14ccf"
};

// This function initializes and returns the Firebase app instance,
// ensuring it's only created once.
function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
