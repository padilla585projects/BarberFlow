import {
  collection, doc, getDocs, updateDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Order } from '../types'

const COL = 'orders'

function toOrder(d: any): Order {
  const data = d.data()
  return {
    id: d.id,
    ...data,
    totalAmount: data.totalAmount ?? data.totalPrice ?? 0,
    clientName: data.clientName ?? 'Cliente',
    clientEmail: data.clientEmail ?? '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  } as Order
}

export async function getOrdersByBarbershop(barbershopId: string): Promise<Order[]> {
  const q = query(
    collection(db, COL),
    where('barbershopId', '==', barbershopId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(toOrder)
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  await updateDoc(doc(db, COL, id), { status, updatedAt: new Date() })
}
