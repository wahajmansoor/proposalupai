
'server-only';

import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

if (!projectId || !clientEmail || !privateKey) {
  console.error("CRITICAL: Firebase Admin environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not fully set. Firebase Admin SDK cannot be initialized.");
} else {
  if (!getApps().length) {
    try {
      const serviceAccount: ServiceAccount = {
        projectId,
        clientEmail,
        // Replace the escaped newline characters from the environment variable
        privateKey: privateKey.replace(/\\n/g, '\n'),
      };
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);

    } catch (e: any) {
      console.error("CRITICAL: Failed to initialize Firebase Admin SDK. Error: ", e.message);
      console.error("Ensure Firebase Admin environment variables are set correctly.");
    }
  } else {
      adminApp = getApps()[0];
      adminAuth = getAuth(adminApp);
      adminDb = getFirestore(adminApp);
  }
}


// @ts-ignore - These will be initialized by the logic above.
export { adminAuth, adminDb };
