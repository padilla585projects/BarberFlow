import { collection, doc, getDocs, getDoc, updateDoc, query, where } from 'firebase/firestore'
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

export async function updateBarberSettings(
  uid: string,
  settings: { appointmentsPerHour?: number; phone?: string; bio?: string }
): Promise<void> {
  await updateDoc(doc(db, COL, uid), settings)
}
