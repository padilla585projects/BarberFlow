#!/usr/bin/env node

/**
 * Crea una cita de prueba en Firestore
 * Uso: node create-test-appointment.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Intentar inicializar con aplicación por defecto (funciona en emulator o cuando Firebase CLI está auth)
try {
  admin.initializeApp();
} catch (e) {
  console.error('Error inicializando Firebase:', e.message);
  process.exit(1);
}

const db = admin.firestore();

async function createTestAppointment() {
  try {
    // IDs de test (según lo visto en las pruebas anteriores)
    const clientId = 'DnwL5EAb7WPbXvdBqVNxzzZKMxa2';  // cliente@test.com
    const barbershopId = 'ZvBHrUgP8B9hKlMnOpQr';  // Barber Norte
    const barberId = 'barber-001'; // ID de barbero de prueba

    const appointmentData = {
      clientId,
      barbershopId,
      barberId,
      barberName: 'Barbero Test',
      clientName: 'Cliente Test',
      barbershopName: 'Barber Norte',
      service: 'Corte Básico',
      startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hora desde ahora
      endTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5 horas desde ahora
      duration: 30,
      status: 'confirmed',
      price: 20,
      notes: 'Cita de prueba para E2E testing',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Crear cita
    const docRef = await db.collection('appointments').add(appointmentData);
    console.log('✅ Cita creada con ID:', docRef.id);
    console.log('📋 Datos:', appointmentData);

    // Leer la cita para confirmar
    const snapshot = await docRef.get();
    console.log('✓ Verificado en Firestore:', snapshot.data());

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestAppointment();
