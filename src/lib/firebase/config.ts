import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeIQXbVxd2Yhyk9bPMkeNxRspRLRQNOj4",
  authDomain: "studio-8937369223-221cd.firebaseapp.com",
  projectId: "studio-8937369223-221cd",
  storageBucket: "studio-8937369223-221cd.appspot.com",
  messagingSenderId: "791256189022",
  appId: "1:791256189022:web:212affb37fb34165d14ccf"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
