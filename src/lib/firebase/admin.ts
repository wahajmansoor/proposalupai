'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminAuth: Auth;
let adminDb: Firestore;

try {
  if (!getApps().length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Missing Firebase Admin credentials. Please check your environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  adminAuth = getAuth();
  adminDb = getFirestore();
} catch (error: any) {
  console.error('Firebase Admin SDK initialization failed:', error);
  // Assign undefined so that downstream checks will fail clearly
  // @ts-ignore
  adminAuth = undefined;
  // @ts-ignore
  adminDb = undefined;
}

export { adminAuth, adminDb };
