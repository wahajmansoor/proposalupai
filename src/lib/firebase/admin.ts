'server-only';
import * as admin from 'firebase-admin';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
}

let app: admin.app.App;

function getAdminApp() {
  if (app) {
    return app;
  }

  if (admin.apps.length > 0) {
    app = admin.app();
    return app;
  }

  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY!;
    const serviceAccount = JSON.parse(serviceAccountString);

    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return app;
  } catch (error: any) {
    console.error('Failed to parse or initialize Firebase Admin SDK:', error);
    throw new Error(
      'Failed to initialize Firebase Admin SDK. Check server logs for details.'
    );
  }
}

export const getAdminAuth = () => admin.auth(getAdminApp());
export const getAdminDb = () => admin.firestore(getAdminApp());
