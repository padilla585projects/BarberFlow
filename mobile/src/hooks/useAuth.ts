import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (!firebaseUser) {
        setState({ firebaseUser: null, profile: null, role: null, loading: false });
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          // First sign-in: create profile with default 'client' role
          const newProfile: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? '',
            photoURL: firebaseUser.photoURL ?? undefined,
            role: 'client',
          };
          await setDoc(userRef, { ...newProfile, createdAt: serverTimestamp() });
        }

        // Listen for realtime changes (role upgrades, profile edits)
        unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as User;
            setState({ firebaseUser, profile, role: profile.role, loading: false });
          }
        });
      } catch (err) {
        console.error('[useAuth] Error fetching profile:', err);
        setState({ firebaseUser, profile: null, role: 'client', loading: false });
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return state;
}
