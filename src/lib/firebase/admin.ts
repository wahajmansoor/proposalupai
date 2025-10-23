'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountString || serviceAccountString === 'your_firebase_service_account_key_here') {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set or is a placeholder. Firebase Admin features will be disabled.');
}

if (!getApps().length && serviceAccountString && serviceAccountString !== 'your_firebase_service_account_key_here') {
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
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY.'
    );
  }
} else if (getApps().length > 0) {
  app = getApps()[0];
}

// @ts-ignore
if (app) {
    // @ts-ignore
    adminAuth = getAuth(app);
    // @ts-ignore
    adminDb = getFirestore(app);
}


// Export potentially undefined values. Code using these must handle the case where they are not available.
export { adminAuth, adminDb };
