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
  Query,
  Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './firebase'
import { BarberProfile, BarberProfilePhoto } from '../types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Obtener perfil de barbero
 */
export async function getBarberProfile(uid: string): Promise<BarberProfile | null> {
  try {
    const docRef = doc(db, 'barber_profiles', uid)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return docSnap.data() as BarberProfile
  } catch (error) {
    console.error('[BARBER_PROFILE] Error getting profile:', error)
    throw error
  }
}

/**
 * Crear nuevo perfil de barbero
 */
export async function createBarberProfile(uid: string, data: Partial<BarberProfile>): Promise<BarberProfile> {
  try {
    const now = new Date()
    const profile: BarberProfile = {
      uid,
      displayName: data.displayName || '',
      phone: data.phone || '',
      bio: data.bio || '',
      location: data.location || { city: '', province: '' },
      professional: data.professional || {
        yearsExperience: 0,
        specialties: [],
        languages: [],
      },
      social: data.social || {},
      portfolio: { photos: [] },
      availability: {
        status: 'unavailable',
        updatedAt: now,
      },
      ratings: {
        averageRating: 0,
        totalReviews: 0,
      },
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(doc(db, 'barber_profiles', uid), profile)
    console.log('[BARBER_PROFILE] Profile created:', uid)
    return profile
  } catch (error) {
    console.error('[BARBER_PROFILE] Error creating profile:', error)
    throw error
  }
}

/**
 * Actualizar perfil de barbero
 */
export async function updateBarberProfile(uid: string, data: Partial<BarberProfile>): Promise<void> {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    }
    await updateDoc(doc(db, 'barber_profiles', uid), updateData as any)
    console.log('[BARBER_PROFILE] Profile updated:', uid)
  } catch (error) {
    console.error('[BARBER_PROFILE] Error updating profile:', error)
    throw error
  }
}

/**
 * Cambiar estado de disponibilidad
 */
export async function updateAvailabilityStatus(
  uid: string,
  status: 'available' | 'unavailable' | 'in_negotiation'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'barber_profiles', uid), {
      'availability.status': status,
      'availability.updatedAt': new Date(),
      updatedAt: new Date(),
    } as any)
    console.log('[BARBER_PROFILE] Availability updated:', uid, status)
  } catch (error) {
    console.error('[BARBER_PROFILE] Error updating availability:', error)
    throw error
  }
}

/**
 * Subir foto al portfolio
 */
export async function uploadPortfolioPhoto(
  uid: string,
  file: File,
  caption?: string,
  tags?: string[]
): Promise<BarberProfilePhoto> {
  try {
    const photoId = uuidv4()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const storagePath = `barber_portfolios/${uid}/${photoId}.${fileExtension}`

    // Subir archivo a Storage
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)

    // Crear objeto foto
    const photo: BarberProfilePhoto = {
      id: photoId,
      url,
      caption,
      uploadedAt: new Date(),
      tags,
    }

    // Agregar a portfolio en Firestore
    const profileRef = doc(db, 'barber_profiles', uid)
    const profileSnap = await getDoc(profileRef)

    if (!profileSnap.exists()) {
      throw new Error('Barber profile does not exist')
    }

    const currentPhotos = (profileSnap.data()?.portfolio?.photos || []) as BarberProfilePhoto[]
    const newPhotos = [...currentPhotos, photo]

    await updateDoc(profileRef, {
      'portfolio.photos': newPhotos,
      updatedAt: new Date(),
    } as any)

    console.log('[BARBER_PROFILE] Photo uploaded:', uid, photoId)
    return photo
  } catch (error) {
    console.error('[BARBER_PROFILE] Error uploading photo:', error)
    throw error
  }
}

/**
 * Eliminar foto del portfolio
 */
export async function deletePortfolioPhoto(uid: string, photoId: string): Promise<void> {
  try {
    const profileRef = doc(db, 'barber_profiles', uid)
    const profileSnap = await getDoc(profileRef)

    if (!profileSnap.exists()) {
      throw new Error('Barber profile does not exist')
    }

    const currentPhotos = (profileSnap.data()?.portfolio?.photos || []) as BarberProfilePhoto[]
    const photoToDelete = currentPhotos.find((p) => p.id === photoId)

    if (!photoToDelete) {
      throw new Error('Photo not found')
    }

    // Eliminar de Storage
    const storagePath = photoToDelete.url.split('/o/')[1]?.split('?')[0] || ''
    if (storagePath) {
      try {
        const storageRef = ref(storage, decodeURIComponent(storagePath))
        await deleteObject(storageRef)
      } catch (err) {
        console.warn('[BARBER_PROFILE] Warning: Could not delete from storage:', err)
      }
    }

    // Eliminar de Firestore
    const newPhotos = currentPhotos.filter((p) => p.id !== photoId)
    await updateDoc(profileRef, {
      'portfolio.photos': newPhotos,
      updatedAt: new Date(),
    } as any)

    console.log('[BARBER_PROFILE] Photo deleted:', uid, photoId)
  } catch (error) {
    console.error('[BARBER_PROFILE] Error deleting photo:', error)
    throw error
  }
}

/**
 * Actualizar caption de foto
 */
export async function updatePhotoCaption(uid: string, photoId: string, caption: string): Promise<void> {
  try {
    const profileRef = doc(db, 'barber_profiles', uid)
    const profileSnap = await getDoc(profileRef)

    if (!profileSnap.exists()) {
      throw new Error('Barber profile does not exist')
    }

    const currentPhotos = (profileSnap.data()?.portfolio?.photos || []) as BarberProfilePhoto[]
    const updatedPhotos = currentPhotos.map((p) => (p.id === photoId ? { ...p, caption } : p))

    await updateDoc(profileRef, {
      'portfolio.photos': updatedPhotos,
      updatedAt: new Date(),
    } as any)

    console.log('[BARBER_PROFILE] Photo caption updated:', uid, photoId)
  } catch (error) {
    console.error('[BARBER_PROFILE] Error updating photo caption:', error)
    throw error
  }
}

/**
 * Obtener todos los perfiles de barberos disponibles (para Fase 2: búsqueda)
 */
export async function getAvailableBarberProfiles(
  limit: number = 50
): Promise<BarberProfile[]> {
  try {
    const q = query(
      collection(db, 'barber_profiles'),
      where('availability.status', '==', 'available')
    )
    const querySnapshot = await getDocs(q)
    const profiles = querySnapshot.docs.map((doc) => doc.data() as BarberProfile)
    return profiles.slice(0, limit)
  } catch (error) {
    console.error('[BARBER_PROFILE] Error getting available profiles:', error)
    throw error
  }
}

/**
 * Calcular rating promedio (helper para cuando se guardan reseñas)
 */
export async function updateBarberRating(barberId: string): Promise<void> {
  try {
    const reviewsQuery = query(
      collection(db, 'barber_reviews'),
      where('barberId', '==', barberId)
    )
    const reviewsSnap = await getDocs(reviewsQuery)
    const reviews = reviewsSnap.docs.map((doc) => doc.data() as any)

    if (reviews.length === 0) {
      await updateDoc(doc(db, 'barber_profiles', barberId), {
        'ratings.averageRating': 0,
        'ratings.totalReviews': 0,
        updatedAt: new Date(),
      } as any)
      return
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = totalRating / reviews.length

    await updateDoc(doc(db, 'barber_profiles', barberId), {
      'ratings.averageRating': Math.round(averageRating * 10) / 10, // 1 decimal
      'ratings.totalReviews': reviews.length,
      'ratings.lastReviewDate': new Date(),
      updatedAt: new Date(),
    } as any)

    console.log('[BARBER_PROFILE] Rating updated:', barberId, averageRating)
  } catch (error) {
    console.error('[BARBER_PROFILE] Error updating rating:', error)
    throw error
  }
}
