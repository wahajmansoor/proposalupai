'use server';
import 'server-only';
import * as admin from 'firebase-admin';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountString) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
}

let serviceAccount: admin.ServiceAccount;
try {
  const parsedServiceAccount = JSON.parse(serviceAccountString);
  // The private_key field has newline characters that need to be un-escaped
  if (parsedServiceAccount.private_key) {
    parsedServiceAccount.private_key = parsedServiceAccount.private_key.replace(
      /\\n/g,
      '\n'
    );
  }
  serviceAccount = parsedServiceAccount;
} catch (error: any) {
  console.error(
    'Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure it is a valid JSON string.',
    error
  );
  throw new Error(
    'Failed to parse FIREBASE_SERVICE_ACCOUNT. Check server logs for details.'
  );
}

function initializeAdminApp() {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    return admin.app();
}

const adminApp = initializeAdminApp();
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

export { adminAuth, adminDb, admin };

export async function getAdminAuth() {
  // The app is already initialized, just return the auth instance.
  return adminAuth;
}
