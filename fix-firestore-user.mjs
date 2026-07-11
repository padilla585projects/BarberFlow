#!/usr/bin/env node
/**
 * Add user document to Firestore for propietario@test.com
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const serviceAccountPath = path.join(__dirname, 'backend', 'serviceAccountKey.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('ERROR: serviceAccountKey.json not found');
    console.error('Path:', serviceAccountPath);
    console.log('\nSin acceso directo a Firestore, usaremos Firebase Console');
    console.log('\nSigue estos pasos manuales:');
    console.log('1. Ve a: https://console.firebase.google.com/project/barberflow-2026/firestore');
    console.log('2. Click "Create document"');
    console.log('3. Collection: users');
    console.log('4. Document ID: lPVlKyePuIe7vWw8oCvuYVuWpPq1');
    console.log('5. Agrega estos fields:');
    console.log('   - uid: lPVlKyePuIe7vWw8oCvuYVuWpPq1 (string)');
    console.log('   - email: propietario@test.com (string)');
    console.log('   - displayName: Owner Test (string)');
    console.log('   - photoURL: (empty)');
    console.log('   - role: owner (string)');
    console.log('\n6. Click "Save"');
    process.exit(0);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf-8')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();

  const uid = 'lPVlKyePuIe7vWw8oCvuYVuWpPq1';
  const userData = {
    uid: uid,
    email: 'propietario@test.com',
    displayName: 'Owner Test',
    photoURL: null,
    role: 'owner',
  };

  console.log('Adding user document to Firestore...');
  console.log(`UID: ${uid}`);
  console.log(`Email: ${userData.email}`);

  db.collection('users').doc(uid).set(userData)
    .then(() => {
      console.log('✅ User document created successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });

} catch (err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
}
