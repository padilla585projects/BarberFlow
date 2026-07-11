import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  Query,
} from 'firebase/firestore'
import { db } from './firebase'
import { BarberReview } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { updateBarberRating } from './barberProfile'

/**
 * Crear nueva reseña para un barbero
 */
export async function createBarberReview(
  barberId: string,
  clientId: string,
  rating: number,
  comment: string,
  appointmentId?: string
): Promise<BarberReview> {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const reviewId = uuidv4()
    const now = new Date()

    const review: BarberReview = {
      id: reviewId,
      barberId,
      clientId,
      rating,
      comment,
      appointmentId,
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(doc(db, 'barber_reviews', reviewId), review)
    console.log('[BARBER_REVIEWS] Review created:', reviewId)

    // Actualizar rating del barbero
    await updateBarberRating(barberId)

    return review
  } catch (error) {
    console.error('[BARBER_REVIEWS] Error creating review:', error)
    throw error
  }
}

/**
 * Obtener todas las reseñas de un barbero
 */
export async function getBarberReviews(barberId: string, limitCount: number = 100): Promise<BarberReview[]> {
  try {
    const q = query(
      collection(db, 'barber_reviews'),
      where('barberId', '==', barberId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as BarberReview)
  } catch (error) {
    console.error('[BARBER_REVIEWS] Error getting reviews:', error)
    throw error
  }
}

/**
 * Obtener reseña específica
 */
export async function getBarberReview(reviewId: string): Promise<BarberReview | null> {
  try {
    const docRef = doc(db, 'barber_reviews', reviewId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return docSnap.data() as BarberReview
  } catch (error) {
    console.error('[BARBER_REVIEWS] Error getting review:', error)
    throw error
  }
}

/**
 * Actualizar reseña (solo el cliente que la creó puede)
 */
export async function updateBarberReview(
  reviewId: string,
  clientId: string,
  rating?: number,
  comment?: string
): Promise<void> {
  try {
    const reviewRef = doc(db, 'barber_reviews', reviewId)
    const reviewSnap = await getDoc(reviewRef)

    if (!reviewSnap.exists()) {
      throw new Error('Review not found')
    }

    const review = reviewSnap.data() as BarberReview
    if (review.clientId !== clientId) {
      throw new Error('Unauthorized: Only the review author can update it')
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5')
      }
      updateData.rating = rating
    }

    if (comment !== undefined) {
      updateData.comment = comment
    }

    await updateDoc(reviewRef, updateData)
    console.log('[BARBER_REVIEWS] Review updated:', reviewId)

    // Recalcular rating del barbero
    await updateBarberRating(review.barberId)
  } catch (error) {
    console.error('[BARBER_REVIEWS] Error updating review:', error)
    throw error
  }
}

/**
 * Eliminar reseña (solo el cliente que la creó puede)
 */
export async function deleteBarberReview(reviewId: string, clientId: string): Promise<void> {
  try {
    const reviewRef = doc(db, 'barber_reviews', reviewId)
    const reviewSnap = await getDoc(reviewRef)

    if (!reviewSnap.exists()) {
      throw new Error('Review not found')
    }

    const review = reviewSnap.data() as BarberReview
    if (review.clientId !== clientId) {
      throw new Error('Unauthorized: Only the review author can delete it')
    }

    await deleteDoc(reviewRef)
    console.log('[BARBER_REVIEWS] Review deleted:', reviewId)

    // Recalcular rating del barbero
    await updateBarberRating(review.barberId)
  } catch (error) {
    console.error('[BARBER_REVIEWS] Error deleting review:', error)
    throw error
  }
}

/**
 * Obtener reseñas recientes de un barbero (para mostrar en perfil)
 */
export async function getRecentBarberReviews(barberId: string, limitCount: number = 5): Promise<BarberReview[]> {
  try {
    const q = query(
      collection(db, 'barber_reviews'),
      where('barberId', '==', barberId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as BarberReview)
  } catch (error) {
    console.error('[BARBER_REVIEWS] Error getting recent reviews:', error)
    throw error
  }
}

/**
 * Obtener reseñas de un cliente a barberos (para historial del cliente)
 */
export async function getClientReviews(clientId: string): Promise<BarberReview[]> {
  try {
    const q = query(
      collection(db, 'barber_reviews'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as BarberReview)
  } catch (error) {
    console.error('[BARBER_REVIEWS] Error getting client reviews:', error)
    throw error
  }
}
