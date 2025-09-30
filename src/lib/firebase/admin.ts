'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

try {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  const serviceAccount = JSON.parse(serviceAccountString);

  // Vercel escapes newlines, so we must un-escape them
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  if (!getApps().length) {
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    app = getApps()[0];
  }

  adminAuth = getAuth(app);
  adminDb = getFirestore(app);

} catch (error: any) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
  // @ts-ignore
  adminAuth = undefined;
  // @ts-ignore
  adminDb = undefined;
}

export { adminAuth, adminDb };
