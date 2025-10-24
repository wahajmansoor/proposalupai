'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App | undefined;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

if (!serviceAccountString || serviceAccountString === 'your_firebase_service_account_key_here') {
  console.error('Firebase Admin SDK initialization failed: Missing or placeholder FIREBASE_SERVICE_ACCOUNT_KEY environment variable. Firebase Admin features will be disabled.');
} else {
  if (!getApps().length) {
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

    } catch (error: any) {
      console.error('Firebase Admin SDK initialization failed:', error);
      // Keep adminAuth and adminDb as null
    }
  } else {
    app = getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
}

export { adminAuth, adminDb };
