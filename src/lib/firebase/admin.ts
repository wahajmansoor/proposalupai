'server-only';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Firebase Admin SDK Error: One or more required environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not set.");
  // @ts-ignore
  adminAuth = undefined;
  // @ts-ignore
  adminDb = undefined;
} else {
  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'), // Replace escaped newlines
  };

  if (!getApps().length) {
    try {
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization failed:', error);
    }
  } else {
    app = getApps()[0];
  }
  
  // @ts-ignore
  adminAuth = app ? getAuth(app) : undefined;
  // @ts-ignore
  adminDb = app ? getFirestore(app) : undefined;
}


export { adminAuth, adminDb };
