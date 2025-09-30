'server-only';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App;

if (!getApps().length) {
  try {
    if (serviceAccountString) {
      // Vercel/production environment
      const serviceAccount = JSON.parse(serviceAccountString);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Local development environment - use Application Default Credentials
      // This requires `gcloud auth application-default login` to have been run
      console.log("Initializing Firebase Admin SDK with Application Default Credentials for local development.");
      const auth = new GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/datastore',
          'https://www.googleapis.com/auth/devstorage.full_control',
          'https://www.googleapis.com/auth/firebase',
          'https://www.googleapis.com/auth/identitytoolkit',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
      });
      const credentials = await auth.getApplicationDefault();
      app = initializeApp({
          credential: {
              getAccessToken: () => {
                  return new Promise((resolve, reject) => {
                      credentials.credential.getAccessToken().then(token => {
                          if (token.token) {
                              resolve({
                                  access_token: token.token,
                                  expires_in: token.expiration_time || 3600
                              });
                          } else {
                              reject(new Error("Failed to get access token"));
                          }
                      }).catch(reject);
                  })
              }
          },
          projectId: credentials.projectId,
      });
    }
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error);
    throw new Error(
      'Could not initialize Firebase Admin SDK. Please ensure your service account credentials are set up correctly.'
    );
  }
} else {
  app = getApps()[0];
}

const adminAuth: Auth = getAuth(app);
const adminDb: Firestore = getFirestore(app);

export { adminAuth, adminDb };
