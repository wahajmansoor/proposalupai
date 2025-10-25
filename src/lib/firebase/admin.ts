'server-only';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString || serviceAccountString.includes('your_firebase_service_account_key_here')) {
  throw new Error('Missing or placeholder FIREBASE_SERVICE_ACCOUNT_KEY environment variable. Please add your service account key to the .env file.');
}

// Function to parse the service account key, handling potential Vercel escaping issues
function getServiceAccount(): ServiceAccount {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return serviceAccount;
  } catch (error: any) {
    console.error('Failed to parse Firebase service account key JSON:', error);
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not valid JSON.');
  }
}

// Singleton pattern to ensure Firebase Admin is initialized only once
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(getServiceAccount()),
  });
} else {
  adminApp = getApps()[0];
}

const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

export { adminAuth, adminDb };
