'server-only';
import * as admin from 'firebase-admin';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const isFirebaseAdminConfigured =
  serviceAccount.projectId &&
  serviceAccount.clientEmail &&
  serviceAccount.privateKey;

if (!isFirebaseAdminConfigured) {
  throw new Error(
    'Firebase Admin SDK is not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file.'
  );
}

let app: admin.app.App;

if (!admin.apps.length) {
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify the Firebase credentials in your .env file.'
    );
  }
} else {
  app = admin.apps[0]!;
}

const adminAuth: Auth = getAuth(app);
const adminDb: Firestore = getFirestore(app);

export { adminAuth, adminDb };
