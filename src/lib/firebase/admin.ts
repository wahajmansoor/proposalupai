'server-only';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
    }
    
    const serviceAccount = JSON.parse(serviceAccountString);

    // The private key from a Vercel env var needs newlines replaced.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Failed to parse or initialize Firebase Admin SDK:', error);
    // Throw a more descriptive error to help with debugging.
    throw new Error('Firebase Admin SDK initialization failed. Check your FIREBASE_SERVICE_ACCOUNT_KEY.');
  }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb };
