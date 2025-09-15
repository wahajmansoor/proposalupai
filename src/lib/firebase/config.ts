import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  projectId: 'studio-8937369223-221cd',
  appId: '1:791256189022:web:212affb37fb34165d14ccf',
  storageBucket: 'studio-8937369223-221cd.firebasestorage.app',
  apiKey: 'AIzaSyCeIQXbVxd2Yhyk9bPMkeNxRspRLRQNOj4',
  authDomain: 'studio-8937369223-221cd.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '791256189022',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export { app };
