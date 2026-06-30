import React, { createContext, useContext } from 'react';
import { useAuth, AuthState } from '../hooks/useAuth';

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  profile: null,
  role: null,
  activeBarbershopId: null,
  memberships: [],
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/**
 * Use this hook in any screen to get the current auth state.
 * Unlike calling useAuth() directly, this shares a single Firestore
 * listener across the entire app via React Context.
 */
export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
