import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBQ0Ra_sfrPq0K3LcvZ-zxGZmCUDzYPdTw',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'redrush-ebc04.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'redrush-ebc04',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'redrush-ebc04.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '276964904825',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:276964904825:android:324cefbaace79e45dfe9a8',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

type ReactNativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

function createAuth(): Auth {
  const authModule = FirebaseAuth as ReactNativeAuthModule;

  try {
    return authModule.initializeAuth(firebaseApp, {
      persistence: authModule.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return authModule.getAuth(firebaseApp);
  }
}

function createFirestore() {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const auth = createAuth();
export const db = createFirestore();
export const storage = getStorage(firebaseApp);
export const functions = getFunctions(firebaseApp);
