'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App;

if (!getApps().length) {
  if (!serviceAccountString || serviceAccountString === 'your_firebase_service_account_key_here') {
    console.error('Missing or placeholder FIREBASE_SERVICE_ACCOUNT_KEY environment variable. Firebase Admin functionality will be disabled.');
    // To prevent a hard crash, we'll assign null and let functions that use it handle the case.
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      
      // Vercel might escape newlines, so we need to replace them back.
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization failed:', error);
      console.error('Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY. Firebase Admin functionality will be disabled.');
    }
  }
} else {
  app = getApps()[0];
}

// @ts-ignore
const adminAuth: Auth = app ? getAuth(app) : null;
// @ts-ignore
const adminDb: Firestore = app ? getFirestore(app) : null;

export { adminAuth, adminDb };
