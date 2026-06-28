import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from './firebase';

// Configure Google Sign-In — called once at module load
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

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
    await GoogleSignin.signOut();
  } catch {
    // Google sign-out may fail if user signed in via another method — that's OK
  }
  await firebaseSignOut(auth);
}
