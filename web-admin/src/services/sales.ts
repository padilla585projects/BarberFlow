import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Sale } from '../types'

const COL = 'sales'

export async function getSalesByBarbershop(barbershopId: string): Promise<Sale[]> {
  const q = query(
    collection(db, COL),
    where('barbershopId', '==', barbershopId),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    } as Sale
  })
}

export async function getSalesByBarber(barberId: string): Promise<Sale[]> {
  const q = query(
    collection(db, COL),
    where('barberId', '==', barberId),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    } as Sale
  })
}

export async function createSale(sale: Omit<Sale, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...sale,
    date: Timestamp.fromDate(sale.date),
  })

  // Decrementar stock de productos vendidos
  for (const item of sale.items) {
    if (item.type === 'product') {
      const productDoc = doc(db, 'products', item.itemId)
      // Leemos el stock actual y restamos cantidad
      // (usamos updateDoc con increment si importamos FieldValue)
      const { getDoc } = await import('firebase/firestore')
      const snap = await getDoc(productDoc)
      if (snap.exists()) {
        const current = snap.data().stock ?? 0
        await updateDoc(productDoc, { stock: Math.max(0, current - item.quantity) })
      }
    }
  }

  return ref.id
}
