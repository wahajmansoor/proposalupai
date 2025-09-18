'use server';
import 'server-only';
import * as admin from 'firebase-admin';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
}

let app: admin.app.App;

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // The private_key needs to have its newlines escaped in the environment variable,
    // so we replace them with actual newlines before initializing.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Failed to parse or initialize Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Check server logs for details.');
  }
} else {
  app = admin.app();
}

const adminAuth = admin.auth(app);
const adminDb = admin.firestore(app);

export { adminAuth, adminDb, admin };

export async function getAdminAuth() {
  return adminAuth;
}
