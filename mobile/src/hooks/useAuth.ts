import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { User, UserRole, Membership } from '../types';
import { consumePendingReferralCode } from '../utils/pendingReferral';

export interface AuthState {
  firebaseUser: FirebaseUser | null;
  profile: User | null;
  role: UserRole | null;
  activeBarbershopId: string | null;
  memberships: Membership[];
  loading: boolean;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/**
 * Determines the effective role from memberships.
 * Priority: developer > owner > barber > client
 */
function resolveRole(profile: User): UserRole {
  if (profile.role === 'developer') return 'developer';

  const memberships = profile.memberships ?? [];
  if (memberships.length === 0) return 'client';
  if (memberships.some((m) => m.role === 'owner')) return 'owner';

  return 'barber';
}

/**
 * Determines the active barbershopId.
 */
function resolveActiveBarbershopId(profile: User): string | null {
  const memberships = profile.memberships ?? [];

  if (profile.activeBarbershopId) {
    if (memberships.some((m) => m.barbershopId === profile.activeBarbershopId)) {
      return profile.activeBarbershopId;
    }
  }

  if (memberships.length > 0) return memberships[0].barbershopId;

  return profile.barbershopId ?? null;
}

function buildStateFromProfile(firebaseUser: FirebaseUser, profile: User): AuthState {
  return {
    firebaseUser,
    profile,
    role: resolveRole(profile),
    activeBarbershopId: resolveActiveBarbershopId(profile),
    memberships: profile.memberships ?? [],
    loading: false,
  };
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
    let isMounted = true;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      // ── Signed out ────────────────────────────────────────────────────
      if (!firebaseUser) {
        if (isMounted) {
          setState({
            firebaseUser: null, profile: null, role: null,
            activeBarbershopId: null, memberships: [], loading: false,
          });
        }
        return;
      }

      // ── Signed in: show loading while we fetch profile ────────────────
      if (isMounted) {
        setState((prev) => ({ ...prev, firebaseUser, loading: true }));
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        // Timeout de 8s para evitar pantalla negra infinita cuando la red es lenta
        const snap = await Promise.race([
          getDoc(userRef),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 8000),
          ),
        ]);

        if (!snap.exists()) {
          // New user — create profile
          const newProfile: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? '',
            photoURL: firebaseUser.photoURL ?? undefined,
            role: 'client',
            memberships: [],
          };
          const referralCode = generateReferralCode();
          const referredBy = consumePendingReferralCode(); // UID del referidor (no el código)
          await setDoc(userRef, {
            ...newProfile,
            referralCode,
            ...(referredBy ? { referredBy } : {}),
            createdAt: serverTimestamp(),
          });

          // Set state immediately for the new user (don't wait for onSnapshot)
          if (isMounted) {
            setState(buildStateFromProfile(firebaseUser, newProfile));
          }
        } else {
          // Existing user — set state immediately from getDoc
          const profile = snap.data() as User;
          if (isMounted) {
            setState(buildStateFromProfile(firebaseUser, profile));
          }
        }

        // Listen for realtime changes (updates role/membership changes live)
        unsubProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists() && isMounted) {
              setState(buildStateFromProfile(firebaseUser, docSnap.data() as User));
            }
          },
          (err) => {
            console.error('[useAuth] onSnapshot error:', err);
            // Don't crash — we already set state from getDoc above
          },
        );
      } catch (err) {
        console.error('[useAuth] Error fetching profile:', err);
        if (isMounted) {
          setState({
            firebaseUser, profile: null, role: 'client',
            activeBarbershopId: null, memberships: [], loading: false,
          });
        }
      }
    });

    return () => {
      isMounted = false;
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return state;
}
