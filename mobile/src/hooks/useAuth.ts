import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { User, UserRole, Membership } from '../types';

export interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  role: UserRole | null;
  activeBarbershopId: string | null;
  memberships: Membership[];
  loading: boolean;
}

/**
 * Determines the effective role from memberships.
 * Priority: developer > owner > barber > client
 * A user with ANY membership is at least 'barber'.
 * A user who OWNS any barbershop is 'owner'.
 */
function resolveRole(profile: User): UserRole {
  // Developer override — set manually in Firestore
  if (profile.role === 'developer') return 'developer';

  const memberships = profile.memberships ?? [];
  if (memberships.length === 0) return 'client';

  // If any membership is 'owner', they're an owner
  if (memberships.some((m) => m.role === 'owner')) return 'owner';

  return 'barber';
}

/**
 * Determines the active barbershopId.
 * Uses explicitly set activeBarbershopId, falls back to first membership,
 * then legacy barbershopId for backward compatibility.
 */
function resolveActiveBarbershopId(profile: User): string | null {
  const memberships = profile.memberships ?? [];

  // Explicit active selection
  if (profile.activeBarbershopId) {
    // Validate it's still a valid membership
    if (memberships.some((m) => m.barbershopId === profile.activeBarbershopId)) {
      return profile.activeBarbershopId;
    }
  }

  // First membership
  if (memberships.length > 0) return memberships[0].barbershopId;

  // Legacy fallback
  return profile.barbershopId ?? null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    profile: null,
    role: null,
    activeBarbershopId: null,
    memberships: [],
    loading: true,
  });

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (!firebaseUser) {
        setState({ firebaseUser: null, profile: null, role: null, activeBarbershopId: null, memberships: [], loading: false });
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          const newProfile: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? '',
            photoURL: firebaseUser.photoURL ?? undefined,
            role: 'client',
            memberships: [],
          };
          await setDoc(userRef, { ...newProfile, createdAt: serverTimestamp() });
        }

        // Listen for realtime changes
        unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as User;
            const role = resolveRole(profile);
            const activeBarbershopId = resolveActiveBarbershopId(profile);
            const memberships = profile.memberships ?? [];
            setState({ firebaseUser, profile, role, activeBarbershopId, memberships, loading: false });
          }
        });
      } catch (err) {
        console.error('[useAuth] Error fetching profile:', err);
        setState({ firebaseUser, profile: null, role: 'client', activeBarbershopId: null, memberships: [], loading: false });
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return state;
}
