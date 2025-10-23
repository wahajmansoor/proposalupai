'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

try {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountString && serviceAccountString !== 'your_firebase_service_account_key_here') {
    if (!getApps().length) {
      const serviceAccount = JSON.parse(serviceAccountString);
      
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      app = getApps()[0];
    }
  } else {
    console.warn(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set or is a placeholder. Firebase Admin features will be disabled.'
    );
  }

  if (app) {
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
  
} catch (error: any) {
  console.error('Firebase Admin SDK initialization failed:', error);
}

// Export potentially undefined values. Code using these must handle the case where they are not available.
export { adminAuth, adminDb };
