import {
  collection, doc, getDocs, addDoc,
  updateDoc, deleteDoc, serverTimestamp, query, where
} from 'firebase/firestore'
import { db } from './firebase'
import { Product } from '../types'

const COL = 'products'

export async function getProductsByBarbershop(barbershopId: string): Promise<Product[]> {
  const q = query(collection(db, COL), where('barbershopId', '==', barbershopId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, COL))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await updateDoc(doc(db, COL, id), data)
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}

export async function updateStock(id: string, newStock: number): Promise<void> {
  await updateDoc(doc(db, COL, id), { stock: newStock })
}
