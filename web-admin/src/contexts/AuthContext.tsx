import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
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
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEVELOPER_EMAILS = ['padilla585.projects@gmail.com']

async function createUserDoc(fbUser: FirebaseUser, overrideName?: string): Promise<User> {
  const role: UserRole = DEVELOPER_EMAILS.includes(fbUser.email ?? '') ? 'developer' : 'client'
  const newUser: User = {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: overrideName ?? fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuario',
    photoURL: fbUser.photoURL ?? undefined,
    role,
  }
  await setDoc(doc(db, 'users', fbUser.uid), newUser)
  return newUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRedirectResult(auth).catch(() => {})

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser)
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
        if (userDoc.exists()) {
          setUser(userDoc.data() as User)
        } else {
          const newUser = await createUserDoc(fbUser)
          setUser(newUser)
        }
      } else {
        setFirebaseUser(null)
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithRedirect(auth, provider)
  }

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged se encarga del resto
  }

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    // Actualizar displayName en Firebase Auth
    await updateProfile(result.user, { displayName: name })
    // Crear doc en Firestore directamente con el nombre correcto
    // (no esperamos a onAuthStateChanged para evitar que se cree sin nombre)
    const newUser = await createUserDoc(result.user, name)
    setUser(newUser)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, loginWithGoogle, loginWithEmail, signUpWithEmail, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
