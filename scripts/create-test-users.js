#!/usr/bin/env node

/**
 * Crear usuarios de prueba via Firebase Admin SDK
 * Uso: node scripts/create-test-users.js
 *
 * Crea:
 * - cliente@test.com (role: client)
 * - barbero@test.com (role: barber)
 * - propietario@test.com (role: owner)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../backend/.runtimeconfig.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: No se encontró configuración de Firebase');
  console.error(`   Esperado en: ${serviceAccountPath}`);
  process.exit(1);
}

// Para desarrollo local, usar credenciales de firebase-emulator o .env
// En este caso, asumimos que firebase-cli ya está configurado
try {
  // Intentar inicializar con credenciales del entorno
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'barberflow-2026',
      databaseURL: 'https://barberflow-2026.firebaseio.com'
    });
  }
} catch (e) {
  console.warn('⚠️  No se pudo auto-inicializar Firebase, intentando con credenciales locales...');
}

const auth = admin.auth();
const db = admin.firestore();

const TEST_USERS = [
  {
    email: 'cliente@test.com',
    password: 'test1234',
    displayName: 'Cliente Test',
    role: 'client'
  },
  {
    email: 'barbero@test.com',
    password: 'test1234',
    displayName: 'Barbero Test',
    role: 'barber'
  },
  {
    email: 'propietario@test.com',
    password: 'test1234',
    displayName: 'Propietario Test',
    role: 'owner'
  }
];

async function createTestUsers() {
  console.log('🔐 Creando usuarios de prueba en Firebase...\n');

  for (const user of TEST_USERS) {
    try {
      console.log(`[*] Creando ${user.email} (${user.role})...`);

      // Crear en Firebase Auth
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName
      });

      console.log(`    ✅ Auth creado: ${userRecord.uid}`);

      // Crear perfil en Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        memberships: [],
        referralCode: generateReferralCode(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`    ✅ Firestore creado`);
      console.log(`    📧 Email: ${user.email}`);
      console.log(`    🔑 Password: ${user.password}`);
      console.log(`    👤 Role: ${user.role}\n`);

    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`    ⚠️  ${user.email} ya existe\n`);
      } else {
        console.error(`    ❌ Error: ${error.message}\n`);
      }
    }
  }

  console.log('✅ Usuarios de prueba listos para testing E2E');
  console.log('\n📝 Credenciales disponibles:');
  for (const user of TEST_USERS) {
    console.log(`   ${user.email} / ${user.password}`);
  }

  process.exit(0);
}

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Ejecutar
createTestUsers().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
