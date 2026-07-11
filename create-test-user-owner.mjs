#!/usr/bin/env node
/**
 * Create test owner user in Firebase
 * Usage: node create-test-user-owner.mjs
 */

import admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  fs.readFileSync('./backend/serviceAccountKey.json', 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://barberflow-2026.firebaseio.com',
});

const auth = admin.auth();
const db = admin.firestore();

const testUsers = [
  {
    email: 'propietario@test.com',
    password: 'test1234',
    displayName: 'Owner Test',
    role: 'owner',
  },
  {
    email: 'cliente@test.com',
    password: 'test1234',
    displayName: 'Cliente Test',
    role: 'client',
  },
  {
    email: 'barbero@test.com',
    password: 'test1234',
    displayName: 'Barbero Test',
    role: 'barber',
  },
];

async function createTestUsers() {
  console.log('Creating test users...\n');

  for (const user of testUsers) {
    try {
      console.log(`Creating: ${user.email}`);

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      });

      console.log(`  ✅ Auth user created: ${userRecord.uid}`);

      // Create user document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: null,
        role: user.role,
        createdAt: new Date(),
      });

      console.log(`  ✅ Firestore doc created`);
      console.log(`  Credentials: ${user.email} / ${user.password}\n`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`  ⚠️  Already exists: ${user.email}\n`);
      } else {
        console.error(`  ❌ Error: ${error.message}\n`);
      }
    }
  }

  console.log('Done!');
  process.exit(0);
}

createTestUsers().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
