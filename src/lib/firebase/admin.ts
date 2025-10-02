
'server-only';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!getApps().length) {
  if (!serviceAccountString || serviceAccountString.includes('your_firebase_service_account_key_here')) {
    console.error("Firebase Admin SDK Warning: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or is a placeholder. Server-side Firebase operations will not be initialized.");
    // Assign undefined to exports so the app can still start without crashing
    // @ts-ignore
    adminAuth = undefined;
    // @ts-ignore
    adminDb = undefined;
  } else {
    try {
      const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);
      
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
      // @ts-ignore
      adminAuth = undefined;
      // @ts-ignore
      adminDb = undefined;
    }
  }
} else {
  app = getApps()[0];
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
}

export { adminAuth, adminDb };
