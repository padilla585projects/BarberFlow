import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { User, UserRole } from '../types';

export interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  role: UserRole | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    profile: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ firebaseUser: null, profile: null, role: null, loading: false });
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const profile = snap.data() as User;
          setState({ firebaseUser, profile, role: profile.role, loading: false });
        } else {
          // First sign-in: create profile with default 'client' role
          const newProfile: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? '',
            photoURL: firebaseUser.photoURL ?? undefined,
            role: 'client',
          };
          await setDoc(userRef, { ...newProfile, createdAt: serverTimestamp() });
          setState({ firebaseUser, profile: newProfile, role: 'client', loading: false });
        }
      } catch (err) {
        console.error('[useAuth] Error fetching profile:', err);
        // Fail safe: treat as client so the user is not stuck on the loading screen
        setState({ firebaseUser, profile: null, role: 'client', loading: false });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}
