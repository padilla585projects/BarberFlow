#!/usr/bin/env node
/**
 * Script para agregar imágenes a productos sin photoURL
 * Usa el Firebase Admin SDK para acceso administrativo
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../.firebase-key.json');
let serviceAccount;

try {
  serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {
  console.error('❌ Error: No se encontró .firebase-key.json');
  console.error('Descarga la clave de servicio desde Firebase Console: Project Settings → Service Accounts');
  process.exit(1);
}

const db = admin.firestore();

const PRODUCT_IMAGES = {
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

async function fixProductImages() {
  console.log('🔧 Iniciando reparación de imágenes de productos...\n');

  try {
    // Obtener todos los productos
    const productsSnapshot = await db.collection('products').get();
    console.log(`📦 Total de productos: ${productsSnapshot.size}`);

    const productsWithoutImage = productsSnapshot.docs.filter(
      doc => !doc.data().photoURL
    );

    console.log(`📸 Productos sin imagen: ${productsWithoutImage.length}\n`);

    if (productsWithoutImage.length === 0) {
      console.log('✅ Todos los productos tienen imágenes');
      return;
    }

    let updated = 0;
    let errors = 0;

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
        errors++;
        console.error(`❌ Error actualizando "${product.name}":`, error.message);
      }
    }

    console.log(`\n🎉 Migración completada:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    if (errors > 0) {
      console.log(`   ❌ Errores: ${errors}`);
    }
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  } finally {
    // Cerrar la app de Firebase
    await admin.app().delete();
    process.exit(0);
  }
}

// Ejecutar
fixProductImages();
