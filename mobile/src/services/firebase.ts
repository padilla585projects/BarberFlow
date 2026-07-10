import { initializeApp } from 'firebase/app';
import { initializeAuth, ReactNativeAsyncStorage } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Validate required Firebase environment variables
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Missing Firebase env var: ${envVar}`);
  }
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Ensure API key is properly formatted and not public-facing issues
if (firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIzaSy')) {
  // This is a valid Firebase API key format
  // Note: The API key must have "Identity Toolkit API" enabled in Google Cloud Console
  // and must NOT have IP/HTTP referrer restrictions that would block mobile app requests
}

const app = initializeApp(firebaseConfig);

// Auth con persistencia nativa (no pierde sesión al cerrar la app)
// getReactNativePersistence existe en el bundle react-native pero TS resuelve tipos browser
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('@firebase/auth') as {
  getReactNativePersistence: (storage: ReactNativeAsyncStorage) => unknown;
};
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage) as any,
});

// Firestore con long-polling para mejor conectividad en React Native.
// El JS SDK incluye caché en memoria por defecto.
// NOTA: Para persistencia offline completa (caché en disco), se requiere
// migrar a @react-native-firebase/firestore (módulo nativo).
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app);

export default app;
