'server-only';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminAuth: Auth;
let adminDb: Firestore;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Firebase Admin SDK Error: One or more required environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not set.");
  // Assign undefined to exports if initialization fails
  // @ts-ignore
  adminAuth = undefined;
  // @ts-ignore
  adminDb = undefined;
} else if (getApps().length === 0) {
  try {
    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'), // Replace escaped newlines
    };

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
