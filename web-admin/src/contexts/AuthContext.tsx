import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { User, UserRole } from '../types'

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  loginWithGoogle: () => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (name: string, email: string, password: string, role?: UserRole) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEVELOPER_EMAILS = ['padilla585.projects@gmail.com']

async function createUserDoc(fbUser: FirebaseUser, overrideName?: string, overrideRole?: UserRole): Promise<User> {
  const role: UserRole = overrideRole ?? (DEVELOPER_EMAILS.includes(fbUser.email ?? '') ? 'developer' : 'owner')
  const newUser: User = {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: overrideName ?? fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuario',
    photoURL: fbUser.photoURL ?? null,
    role,
  }
  try {
    await setDoc(doc(db, 'users', fbUser.uid), newUser)
    console.log('[AUTH] User document created successfully:', fbUser.uid, newUser)
  } catch (error) {
    console.error('[AUTH] Error creating user document:', error)
    // Re-throw with more context
    throw new Error(`Failed to create user document: ${error instanceof Error ? error.message : String(error)}`)
  }
  return newUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          console.log('[AUTH] User authenticated via onAuthStateChanged:', fbUser.uid)
          setFirebaseUser(fbUser)
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
          if (userDoc.exists()) {
            console.log('[AUTH] User document found in Firestore')
            setUser(userDoc.data() as User)
          } else {
            console.log('[AUTH] User document not found, creating...')
            const newUser = await createUserDoc(fbUser)
            setUser(newUser)
          }
        } else {
          console.log('[AUTH] No authenticated user')
          setFirebaseUser(null)
          setUser(null)
        }
      } catch (error) {
        console.error('[AUTH] Error in onAuthStateChanged:', error)
        setFirebaseUser(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const loginWithEmail = async (email: string, password: string) => {
    try {
      console.log('[AUTH] Signing in with email:', email)
      await signInWithEmailAndPassword(auth, email, password)
      console.log('[AUTH] Email sign-in successful, onAuthStateChanged will handle the rest')
      // onAuthStateChanged se encarga del resto
    } catch (error) {
      console.error('[AUTH] Email sign-in error:', error)
      throw error
    }
  }

  const signUpWithEmail = async (name: string, email: string, password: string, role?: UserRole) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      console.log('[AUTH] User created in Firebase Auth:', result.user.uid)

      // Actualizar displayName en Firebase Auth
      try {
        await updateProfile(result.user, { displayName: name })
        console.log('[AUTH] Display name updated in Firebase Auth')
      } catch (profileError) {
        console.warn('[AUTH] Warning: Could not update profile:', profileError)
        // Continuar incluso si el perfil no se actualiza
      }

      // Crear doc en Firestore directamente con el nombre correcto
      // (no esperamos a onAuthStateChanged para evitar que se cree sin nombre)
      const newUser = await createUserDoc(result.user, name, role)
      console.log('[AUTH] User document created, setting user state')
      setUser(newUser)
      setLoading(false)
    } catch (error) {
      console.error('[AUTH] Error in signUpWithEmail:', error)
      setLoading(false)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const logout = async () => {
    await signOut(auth)
  }

  const refreshUser = async () => {
    if (!firebaseUser) return
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    if (userDoc.exists()) setUser(userDoc.data() as User)
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, loginWithGoogle, loginWithEmail, signUpWithEmail, resetPassword, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
