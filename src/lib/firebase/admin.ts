'server-only';
import * as admin from 'firebase-admin';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }
    
    const serviceAccount = JSON.parse(serviceAccountString);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY environment variable is a valid JSON string.'
    );
  }
}

const adminAuth: Auth = admin.auth();
const adminDb: Firestore = admin.firestore();

export { adminAuth, adminDb };
