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
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;