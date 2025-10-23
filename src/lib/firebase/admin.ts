
'use server';
import { initializeApp, getApps, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// This function can be called by any server-side code to ensure
// the Firebase Admin SDK is initialized before use.
export async function getFirebaseAdmin() {
  const existingApp = getApps().find(app => app.name === '[DEFAULT]');
  
  if (existingApp) {
    return { 
      app: existingApp, 
      adminAuth: getAuth(existingApp), 
      adminDb: getFirestore(existingApp) 
    };
  }

  // Construct the service account from individual environment variables
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace escaped newlines from .env file
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  // Check if all necessary service account details are present
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('Firebase Admin SDK not configured. The FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables are required. Server-side Firebase features will be disabled.');
    // Explicitly return undefined for all properties
    return { app: undefined, adminAuth: undefined, adminDb: undefined };
  }

  try {
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
