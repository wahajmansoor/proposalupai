
'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

export function getFirebaseAdmin() {
  if (app) {
    return { app, adminAuth, adminDb };
  }
  
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString || serviceAccountString === 'your_firebase_service_account_key_here') {
    throw new Error('Missing or placeholder FIREBASE_SERVICE_ACCOUNT_KEY environment variable. Please add your service account key to the .env file.');
  }
  
  if (!getApps().length) {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      
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
  } else {
    app = getApps()[0];
  }
  
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);

  return { app, adminAuth, adminDb };
}
