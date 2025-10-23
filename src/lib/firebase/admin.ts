
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
    return { app: undefined, adminAuth: undefined, adminDb: undefined };
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    
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
    // Return undefined instances but don't throw, to prevent app crash
    return { app: undefined, adminAuth: undefined, adminDb: undefined };
  }
}
