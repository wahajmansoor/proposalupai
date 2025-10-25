
'server-only';

import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString || serviceAccountString.includes('your_firebase_service_account_key_here')) {
  console.error('Missing or placeholder FIREBASE_SERVICE_ACCOUNT_KEY environment variable. The application will not function correctly without it.');
  // In a real application, you might want to throw an error here to prevent startup.
  // For this environment, we will log the error and let it proceed,
  // though Firebase Admin features will fail.
}


function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    if (!serviceAccountString) {
      throw new Error('Firebase Admin SDK not configured. Please add your service account key to the .env file.');
    }

    try {
        const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);
        
        // Vercel escapes newlines, so we need to replace them back.
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        return initializeApp({
            credential: cert(serviceAccount),
        });

    } catch (error: any) {
        console.error('Failed to parse or initialize Firebase Admin SDK:', error);
        throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not valid or could not be processed.');
    }
}

const adminApp: App = getAdminApp();
const adminAuth: Auth = getAuth(adminApp);
const adminDb: Firestore = getFirestore(adminApp);

export { adminAuth, adminDb };
