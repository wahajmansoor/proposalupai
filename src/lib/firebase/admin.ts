'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountString || serviceAccountString.includes('your_firebase_service_account_key_here')) {
  throw new Error('Missing or placeholder FIREBASE_SERVICE_ACCOUNT_KEY environment variable. Please add your full service account JSON key to the .env.local file.');
}

let app: App;

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Vercel and other environments might escape newlines, so we need to replace them back.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY in your .env.local file is a valid JSON object.'
    );
  }
} else {
  app = getApps()[0];
}

const adminAuth: Auth = getAuth(app);
const adminDb: Firestore = getFirestore(app);

export { adminAuth, adminDb };
