import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import Constants from 'expo-constants';
import { auth } from './firebase';

// @react-native-google-signin/google-signin requires a native build
// (expo run:android / eas build). In Expo Go the native module is missing and
// even *importing* the package throws "TurboModuleRegistry.getEnforcing(...)
// 'RNGoogleSignin' could not be found", crashing the entire import chain.
// Use a lazy require() so the module is never loaded in Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let GoogleSignin: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let statusCodes: any = null;

if (!isExpoGo) {
  try {
    const gsi = require('@react-native-google-signin/google-signin');
    GoogleSignin = gsi.GoogleSignin;
    statusCodes = gsi.statusCodes;

    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  } catch (e) {
    console.warn('[auth] Failed to initialize Google Sign-In:', e);
  }
}

/**
 * Google Sign-In flow:
 * 1. Opens Google account picker
 * 2. Gets idToken
 * 3. Signs in to Firebase with Google credential
 *
 * NOTE: Requires a native build (expo run:android / eas build).
 * Does NOT work inside Expo Go.
 */
export async function signInWithGoogle() {
  if (!GoogleSignin) {
    throw new Error(
      'Google Sign-In no está disponible en Expo Go. ' +
      'Usa email/contraseña o genera un development build.',
    );
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();

  if (response.type !== 'success') {
    const msg =
      response.type === 'cancelled'
        ? 'Inicio de sesión cancelado'
        : 'No se pudo iniciar sesión con Google';
    throw new Error(msg);
  }

  const { idToken } = response.data;
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signOut() {
  try {
    if (GoogleSignin) {
      await GoogleSignin.signOut();
    }
  } catch {
    // Google sign-out may fail if user signed in via another method — that's OK
  }
  await firebaseSignOut(auth);
}
