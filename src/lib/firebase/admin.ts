'server-only';
import admin from 'firebase-admin';

// Define the service account structure for type safety
interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

// This function ensures Firebase Admin is initialized only once.
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
  }

  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

    // Vercel might escape newlines, so we need to replace them back.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Verify the FIREBASE_SERVICE_ACCOUNT_KEY in your environment variables.'
    );
  }
};

// Initialize the app
const adminApp = initializeAdminApp();

// Export auth and db instances for use in other server-side files
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

export { adminAuth, adminDb };
