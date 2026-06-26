import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where
} from 'firebase/firestore'
import { db } from './firebase'
import { Barbershop } from '../types'

const COL = 'barbershops'

export async function getAllBarbershops(): Promise<Barbershop[]> {
  const snap = await getDocs(collection(db, COL))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Barbershop))
}

export async function getBarbershopById(id: string): Promise<Barbershop | null> {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } as Barbershop : null
}

export async function getBarbershopByOwner(ownerId: string): Promise<Barbershop | null> {
  const q = query(collection(db, COL), where('ownerId', '==', ownerId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Barbershop
}

export async function createBarbershop(data: Omit<Barbershop, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateBarbershop(id: string, data: Partial<Barbershop>): Promise<void> {
  await updateDoc(doc(db, COL, id), data)
}

export async function deleteBarbershop(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
