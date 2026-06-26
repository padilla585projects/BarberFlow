import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Appointment } from '../types'

const COL = 'appointments'

export async function getAppointmentsByBarbershop(barbershopId: string): Promise<Appointment[]> {
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
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    } as Appointment
  })
}

export async function getAppointmentsByBarber(barberId: string): Promise<Appointment[]> {
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
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    } as Appointment
  })
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status']
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status })
}

export async function createAppointment(data: Omit<Appointment, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: Timestamp.now(),
  })
  return ref.id
}
