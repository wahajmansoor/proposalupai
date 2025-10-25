
'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

let app: App;

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY.'
    );
  }
} else {
  app = getApps()[0];
}

const adminAuth: Auth = getAuth(app);
const adminDb: Firestore = getFirestore(app);

export { adminAuth, adminDb };
