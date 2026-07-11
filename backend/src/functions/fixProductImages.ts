import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

/**
 * HTTP Function to fix product images by adding photoURL to products that don't have one
 * Usage: POST /fixProductImages
 * Admin only
 */

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
};

export const fixProductImages = functions.https.onRequest(
  async (req: Request, res: Response) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      console.log('🔧 Iniciando reparación de imágenes de productos...');

      const db = admin.firestore();

      // Obtener todos los productos
      const productsSnapshot = await db.collection('products').get();
      console.log(`📦 Total de productos: ${productsSnapshot.size}`);

      const productsWithoutImage = productsSnapshot.docs.filter(
        doc => !doc.data().photoURL
      );

      console.log(`📸 Productos sin imagen: ${productsWithoutImage.length}`);

      if (productsWithoutImage.length === 0) {
        console.log('✅ Todos los productos tienen imágenes');
        res.status(200).json({
          success: true,
          message: 'All products already have images',
          updated: 0,
          errors: []
        });
        return;
      }

      let updated = 0;
      const errors: string[] = [];

      // Actualizar cada producto
      for (const productDoc of productsWithoutImage) {
        const product = productDoc.data();
        const imageUrl = PRODUCT_IMAGES[product.category] || PRODUCT_IMAGES['Otro'];

        try {
          await db.collection('products').doc(productDoc.id).update({
            photoURL: imageUrl,
          });
          updated++;
          console.log(`✅ "${product.name}" actualizado con imagen de ${product.category}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Error actualizando ${product.name}: ${errorMsg}`);
          console.error(`❌ Error actualizando "${product.name}":`, errorMsg);
        }
      }

      console.log(`🎉 Migración completada: ${updated} actualizados, ${errors.length} errores`);

      res.status(200).json({
        success: true,
        message: 'Product images fixed',
        updated,
        errors,
        total: productsWithoutImage.length
      });
    } catch (error) {
      console.error('❌ Error en la migración:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
);
