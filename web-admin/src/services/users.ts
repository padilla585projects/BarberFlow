import { collection, doc, getDocs, getDoc, updateDoc, query, where, deleteField, arrayUnion } from 'firebase/firestore'
import { db } from './firebase'
import { User, UserRole } from '../types'

const COL = 'users'

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, COL))
  return snap.docs.map(d => ({ ...d.data() } as User))
}

export async function getUsersByBarbershop(barbershopId: string): Promise<User[]> {
  const q = query(collection(db, COL), where('barbershopId', '==', barbershopId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ ...d.data() } as User))
}

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, COL, uid))
  return snap.exists() ? snap.data() as User : null
}

export async function updateUserRole(uid: string, role: UserRole, barbershopId?: string): Promise<void> {
  await updateDoc(doc(db, COL, uid), {
    role,
    ...(barbershopId !== undefined ? { barbershopId } : {}),
  })
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data() as User
}

export async function addBarberToShop(uid: string, barbershopId: string, barbershopName: string): Promise<void> {
  // Keep barbershopId for backward compat, set activeBarbershopId, and append
  // to memberships[] — must stay in sync with mobile's JoinBarbershopScreen,
  // otherwise the app's useAuth() (which reads memberships[]) and
  // firestore.rules (which read barbershopId) disagree and the barber gets
  // "Missing or insufficient permissions" on their own shop's data.
  await updateDoc(doc(db, 'users', uid), {
    role: 'barber',
    barbershopId,
    activeBarbershopId: barbershopId,
    memberships: arrayUnion({
      barbershopId,
      barbershopName,
      role: 'barber',
      joinedAt: new Date(),
    }),
  })
}

export async function removeBarberFromShop(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role: 'client', barbershopId: deleteField() })
}

export async function updateBarberSettings(
  uid: string,
  settings: { appointmentsPerHour?: number; phone?: string; bio?: string }
): Promise<void> {
  await updateDoc(doc(db, COL, uid), settings)
}
