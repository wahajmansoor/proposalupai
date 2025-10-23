
'use server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// This function can be called by any server-side code to ensure
// the Firebase Admin SDK is initialized before use.
export async function getFirebaseAdmin() {
  const existingApp = getApps().find(app => app.name === 'DEFAULT');
  
  if (existingApp) {
    return { 
      app: existingApp, 
      adminAuth: getAuth(existingApp), 
      adminDb: getFirestore(existingApp) 
    };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountString || serviceAccountString === 'your_firebase_service_account_key_here') {
    console.warn('Firebase Admin SDK not configured. The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing or is a placeholder. Server-side Firebase features will be disabled.');
    // Explicitly return undefined for all properties
    return { app: undefined, adminAuth: undefined, adminDb: undefined };
  }

  try {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountString);
    } catch (e: any) {
      // Throw a more specific error if JSON parsing fails
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it's a valid JSON string. Details: ${e.message}`);
    }
    
    // Vercel might escape newlines, so we need to replace them back.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    const app = initializeApp({
      credential: cert(serviceAccount),
    });

    const adminAuth = getAuth(app);
    const adminDb = getFirestore(app);

    return { app, adminAuth, adminDb };
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error.message);
    // Re-throw the error to be caught by the calling function
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}
