
'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

export function getFirebaseAdmin() {
  if (getApps().length > 0) {
    app = getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
    return { app, adminAuth, adminDb };
  }
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing one or more required Firebase Admin SDK environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
  }

  // Vercel might escape newlines, so we need to replace them back.
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  try {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
    
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify the Firebase environment variables.'
    );
  }

  return { app, adminAuth, adminDb };
}
