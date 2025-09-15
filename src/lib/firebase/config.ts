import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './client-config';

// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export { app };
