/**
 * Script de migración para agregar imágenes a productos sin photoURL
 * Usa URLs de imágenes públicas de Unsplash como prueba
 */

import {
  collection, getDocs, updateDoc, doc
} from 'firebase/firestore'
import { db } from './firebase'
import { Product } from '../types'

const PRODUCT_IMAGES: Record<string, string> = {
  'Champú': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop',
  'Gel': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&h=300&fit=crop',
  'Cera': 'https://images.unsplash.com/photo-1596426885443-6a8f4c8d2b3d?w=300&h=300&fit=crop',
  'Aceite': 'https://images.unsplash.com/photo-1585314062340-f4dbf999eca8?w=300&h=300&fit=crop',
  'Crema': 'https://images.unsplash.com/photo-1570194676112-8f0d1b84ded7?w=300&h=300&fit=crop',
  'Aftershave': 'https://images.unsplash.com/photo-1556228541-4f04e48dd8c3?w=300&h=300&fit=crop',
  'Perfume': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop',
  'Accesorios': 'https://images.unsplash.com/photo-1599662015589-0fb1e1f9ade8?w=300&h=300&fit=crop',
  'Otro': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&h=300&fit=crop',
}

export async function fixProductImages(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  try {
    console.log('[fixProductImages] Iniciando migración de imágenes...')

    // Obtener todos los productos
    const productsRef = collection(db, 'products')

    let allProducts: Product[] = []
    try {
      const snap = await getDocs(productsRef)
      allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
    } catch (e) {
      console.error('[fixProductImages] Error al obtener productos:', e)
      errors.push(`Error al obtener productos: ${e}`)
      return { updated, errors }
    }

    console.log(`[fixProductImages] Encontrados ${allProducts.length} productos`)

    // Filtrar productos sin imagen
    const productsWithoutImage = allProducts.filter(p => !p.photoURL)
    console.log(`[fixProductImages] ${productsWithoutImage.length} productos sin imagen`)

    // Actualizar cada producto
    for (const product of productsWithoutImage) {
      try {
        const imageUrl = PRODUCT_IMAGES[product.category] || PRODUCT_IMAGES['Otro']
        const productRef = doc(db, 'products', product.id)

        console.log(`[fixProductImages] Actualizando "${product.name}" con imagen de ${product.category}`)

        await updateDoc(productRef, {
          photoURL: imageUrl,
        })

        updated++
      } catch (error) {
        console.error(`[fixProductImages] Error actualizando ${product.name}:`, error)
        errors.push(`Error actualizando ${product.name}: ${error}`)
      }
    }

    console.log(`[fixProductImages] Migración completada: ${updated} productos actualizados`)
  } catch (error) {
    console.error('[fixProductImages] Error general:', error)
    errors.push(`Error general: ${error}`)
  }

  return { updated, errors }
}
