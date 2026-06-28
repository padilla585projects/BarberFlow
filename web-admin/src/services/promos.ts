import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Promo } from '../types'

const COL = 'promos'

function toPromo(d: any): Promo {
  const data = d.data()
  return {
    id: d.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt ?? 0),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : (data.expiresAt ? new Date(data.expiresAt) : undefined),
  } as Promo
}

export async function getPromosByBarbershop(barbershopId: string): Promise<Promo[]> {
  const q = query(collection(db, COL), where('barbershopId', '==', barbershopId))
  const snap = await getDocs(q)
  return snap.docs.map(toPromo)
}

export async function createPromo(data: Omit<Promo, 'id' | 'usedCount' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    usedCount: 0,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePromo(id: string, data: Partial<Promo>): Promise<void> {
  await updateDoc(doc(db, COL, id), data)
}

export async function deletePromo(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
