'use server';
import 'server-only';
import * as admin from 'firebase-admin';

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    return admin.app();
  } catch (error: any) {
     console.error('Failed to parse or initialize Firebase Admin SDK:', error);
     throw new Error('Failed to initialize Firebase Admin SDK. Check server logs for details.');
  }
}

const adminApp = initializeAdminApp();
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

export { adminAuth, adminDb, admin };

export async function getAdminAuth() {
  // The app is already initialized, just return the auth instance.
  return adminAuth;
}
