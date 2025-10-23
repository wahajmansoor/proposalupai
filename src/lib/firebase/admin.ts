
'use server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

// This function can be called by any server-side code to ensure
// the Firebase Admin SDK is initialized before use.
export async function getFirebaseAdmin() {
  if (app) {
    return { app, adminAuth: adminAuth!, adminDb: adminDb! };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString || serviceAccountString === 'your_firebase_service_account_key_here') {
    throw new Error('Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    app = initializeApp({
      credential: cert(serviceAccount),
    });

    adminAuth = getAuth(app);
    adminDb = getFirestore(app);

    return { app, adminAuth, adminDb };
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error.message);
    throw new Error('Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY.');
  }
}

    