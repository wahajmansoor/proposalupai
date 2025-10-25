
'server-only';

import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

if (!serviceAccountString) {
  console.error("CRITICAL: FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Admin SDK cannot be initialized.");
} else {
  if (!getApps().length) {
    try {
      const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

      // Vercel escapes newlines, so we need to replace them back.
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);

    } catch (e: any) {
      console.error("CRITICAL: Failed to initialize Firebase Admin SDK. Error: ", e.message);
      console.error("Ensure FIREBASE_SERVICE_ACCOUNT_KEY is a valid JSON string.");
    }
  } else {
      adminApp = getApps()[0];
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
  }
}


// @ts-ignore - These will be initialized by the logic above.
export { adminAuth, adminDb };
