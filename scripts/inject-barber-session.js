#!/usr/bin/env node

/**
 * Login automatizado para M9 (HT54BYJ01402) via clipboard + paste
 * Uso: node inject-barber-session.js
 */

const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execAsync = promisify(exec);
const BARBER_EMAIL = 'barbero@test.com';
const BARBER_PASSWORD = 'test1234';
const DEVICE_SERIAL = 'HT54BYJ01402';

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function typeViaClipboard(deviceSerial, text) {
  // Copiar al clipboard del dispositivo usando adb
  // Nota: Esto requiere que el dispositivo esté rooted o que use un método alternativo
  console.log(`  ⌨️  Pegando: ${text}`);

  // Método: usar echo + xclip en el dispositivo (si está disponible)
  // O más simple: usar input text con escapado
  try {
    const escaped = text.replace(/'/g, "\\'");
    await execAsync(`adb -s ${deviceSerial} shell input text '${escaped}'`);
  } catch (e) {
    console.warn(`  ⚠️  Error: ${e.message}`);
  }
}

async function tap(deviceSerial, x, y) {
  await execAsync(`adb -s ${deviceSerial} shell input tap ${x} ${y}`);
  await delay(300);
}

async function keypress(deviceSerial, keycode) {
  await execAsync(`adb -s ${deviceSerial} shell input keyevent ${keycode}`);
  await delay(100);
}

async function loginBarber(deviceSerial) {
  console.log('🔐 Iniciando login de barbero en M9 (HT54BYJ01402)\n');

  // Coordenadas estándar para pantalla HD (1080x1920)
  // Ajustar según resolución real del M9
  const emailFieldX = 540, emailFieldY = 370;
  const passwordFieldX = 540, passwordFieldY = 470;
  const loginButtonX = 540, loginButtonY = 580;

  console.log('Paso 1: Tocando campo de email...');
  await tap(deviceSerial, emailFieldX, emailFieldY);

  console.log('Paso 2: Escribiendo email...');
  await typeViaClipboard(deviceSerial, BARBER_EMAIL);
  await delay(500);

  console.log('\nPaso 3: Tocando campo de contraseña...');
  await tap(deviceSerial, passwordFieldX, passwordFieldY);

  console.log('Paso 4: Escribiendo contraseña...');
  await typeViaClipboard(deviceSerial, BARBER_PASSWORD);
  await delay(500);

  console.log('\nPaso 5: Tocando botón de login...');
  await tap(deviceSerial, loginButtonX, loginButtonY);

  console.log('\n✅ Comandos enviados. Aguardando autenticación (15s)...');
  await delay(15000);
}

async function main() {
  try {
    await loginBarber(DEVICE_SERIAL);
    console.log('\n🎯 Login completado. Verificar M9 para confirmar sesión del barbero.');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
