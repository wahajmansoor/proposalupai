'server-only';
import * as admin from "firebase-admin";

// This check prevents re-initializing the app on every hot-reload
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key must have its newlines replaced to be parsed correctly
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error: any) {
     console.error('Firebase Admin initialization error', error);
     throw new Error('Failed to initialize Firebase Admin SDK. Check your service account environment variables.');
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
