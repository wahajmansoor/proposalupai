'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (getApps().length === 0 && serviceAccountString && serviceAccountString !== 'your_firebase_service_account_key_here') {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Vercel might escape newlines, so we need to replace them back.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    app = initializeApp({
      credential: cert(serviceAccount),
    });

    adminAuth = getAuth(app);
    adminDb = getFirestore(app);

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error.message);
    console.error('Please verify the FIREBASE_SERVICE_ACCOUNT_KEY in your environment variables. Admin features will be disabled.');
  }
} else if (getApps().length > 0) {
  app = getApps()[0];
  if (app) {
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
} else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set or is a placeholder. Firebase Admin features will be disabled.');
}


// Export potentially undefined values. Code using these must handle the case where they are not available.
export { adminAuth, adminDb };
