'server-only';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminAuth: Auth;
let adminDb: Firestore;

// Use the full service account key from the environment variable.
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString || serviceAccountString.includes('your_firebase_service_account_key_here')) {
  console.error("Firebase Admin SDK Error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or is a placeholder.");
  // Assign undefined to exports if initialization fails so the app can still start
  // @ts-ignore
  adminAuth = undefined;
  // @ts-ignore
  adminDb = undefined;

} else if (getApps().length === 0) {
  try {
    // Parse the JSON string into a ServiceAccount object
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);
    
    // Vercel might escape newlines in the private key, so we need to replace them back.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    const app: App = initializeApp({
      credential: cert(serviceAccount),
    });
    
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // @ts-ignore
    adminAuth = undefined;
    // @ts-ignore
    adminDb = undefined;
  }
} else {
  const app = getApps()[0];
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
}

export { adminAuth, adminDb };
