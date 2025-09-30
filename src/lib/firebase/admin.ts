
'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

if (!serviceAccountString) {
  console.error('Firebase Admin SDK Error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  // @ts-ignore - Allow adminAuth and adminDb to be undefined if initialization fails
  adminAuth = undefined;
  // @ts-ignore
  adminDb = undefined;
} else {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);

    // Vercel might escape newlines, so we need to replace them back.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!getApps().length) {
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      app = getApps()[0];
    }

    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // @ts-ignore - Allow adminAuth and adminDb to be undefined if initialization fails
    adminAuth = undefined;
    // @ts-ignore
    adminDb = undefined;
  }
}

export { adminAuth, adminDb };
