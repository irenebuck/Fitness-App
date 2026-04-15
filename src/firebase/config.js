// Firebase configuration
// TODO: Replace these placeholder values with your actual Firebase project credentials.
// Steps:
//   1. Go to https://console.firebase.google.com/
//   2. Create or open your project
//   3. Go to Project Settings > General > Your apps > Web app
//   4. Copy the firebaseConfig object values below
//
// Required Firebase services to enable:
//   - Authentication (Email/Password provider)
//   - Firestore Database
//   - Storage (for image uploads)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
