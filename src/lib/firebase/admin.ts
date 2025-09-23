'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Check for the required environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    'Missing Firebase Admin SDK environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file.'
  );
}

// Format the private key correctly by replacing escaped newlines
const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

const serviceAccount = {
  projectId,
  clientEmail,
  privateKey: formattedPrivateKey,
};

let app: App;

if (!getApps().length) {
  try {
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify your Firebase Admin environment variables.'
    );
  }
} else {
  app = getApps()[0];
}

const adminAuth: Auth = getAuth(app);
const adminDb: Firestore = getFirestore(app);

export { adminAuth, adminDb };
