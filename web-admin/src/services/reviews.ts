import {
  collection, doc, getDocs, deleteDoc,
  query, where, orderBy, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { Review } from '../types'

const COL = 'reviews'

function toReview(d: any): Review {
  const data = d.data()
  return {
    id: d.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  } as Review
}

export async function getReviewsByBarbershop(barbershopId: string): Promise<Review[]> {
  const q = query(
    collection(db, COL),
    where('barbershopId', '==', barbershopId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(toReview)
}

export async function deleteReview(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id))
}
