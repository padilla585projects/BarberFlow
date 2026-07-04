import {
  collection, doc, getDocs, updateDoc, addDoc,
  query, where, orderBy, Timestamp, serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Order, OrderItem } from '../types'

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

export interface CreateOrderData {
  clientId: string
  clientName: string
  clientEmail: string
  barbershopId: string
  barbershopName: string
  items: OrderItem[]
  totalAmount: number
  notes?: string
  paymentMethod: 'cash' | 'bizum' | 'paypal'
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

export async function updateOrderPaymentStatus(
  id: string,
  paymentStatus: NonNullable<Order['paymentStatus']>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { paymentStatus })
}

export async function getOrdersByClient(clientId: string): Promise<Order[]> {
  const q = query(
    collection(db, COL),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(toOrder)
}

export async function createOrder(data: CreateOrderData): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}
