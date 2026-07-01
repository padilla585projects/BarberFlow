/**
 * Seed demo data — productos con fotos + servicios variados
 * Uso: cd backend && node seed-demo-data.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ID = 'barberflow-2026';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Token del firebase CLI
const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const TOKEN = config.tokens.access_token;

if (Date.now() > config.tokens.expires_at - 30_000) {
  console.error('❌ Token expirado. Ejecuta: npx firebase-tools projects:list');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string')  return { stringValue: val };
  if (typeof val === 'number')  return val % 1 === 0 ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (val instanceof Date)      return { timestampValue: val.toISOString() };
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
  return fields;
}

async function addDoc(collection, data) {
  const url = `${FIRESTORE_BASE}/${collection}`;
  const body = JSON.stringify({ fields: toFields(data) });
  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) throw new Error(`addDoc ${collection} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function patchDoc(collection, docId, data) {
  const url = `${FIRESTORE_BASE}/${collection}/${docId}`;
  const body = JSON.stringify({ fields: toFields(data) });
  const res = await fetch(url, { method: 'PATCH', headers, body });
  if (!res.ok) throw new Error(`patchDoc failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listDocs(collection) {
  const url = `${FIRESTORE_BASE}/${collection}?pageSize=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`listDocs failed: ${res.status}`);
  const data = await res.json();
  return data.documents || [];
}

async function deleteDoc(fullName) {
  // fullName is like "projects/barberflow-2026/databases/(default)/documents/products/xyz"
  const url = `https://firestore.googleapis.com/v1/${fullName}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) console.warn(`  ⚠️  No se pudo borrar: ${res.status}`);
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Creando datos demo con fotos...\n');

  // ── 1. Borrar productos existentes de barberia-demo ─────────────────────────
  console.log('🗑️  Limpiando productos anteriores...');
  const existing = await listDocs('products');
  for (const doc of existing) {
    await deleteDoc(doc.name);
  }
  console.log(`   Borrados ${existing.length} productos\n`);

  // ── 2. Productos con fotos (URLs de imágenes libres de derechos) ────────────
  const products = [
    {
      name: 'Pomada Mate Profesional',
      description: 'Acabado mate natural con fijación media. Ideal para looks modernos y texturizados. No deja residuos.',
      price: 14.99,
      stock: 18,
      category: 'Styling',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400&h=400&fit=crop',
    },
    {
      name: 'Aceite de Barba Premium',
      description: 'Blend de aceites naturales: argán, jojoba y vitamina E. Hidrata, suaviza y da brillo a la barba.',
      price: 18.50,
      stock: 12,
      category: 'Barba',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1621607505288-c6b33afab8f0?w=400&h=400&fit=crop',
    },
    {
      name: 'Gel Fijador Extra Fuerte',
      description: 'Fijación máxima durante todo el día. Resistente al agua y la humedad. Sin efecto cartón.',
      price: 9.99,
      stock: 25,
      category: 'Styling',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1597854710180-05e00b286803?w=400&h=400&fit=crop',
    },
    {
      name: 'Champú Anticaída',
      description: 'Fórmula con biotina y cafeína. Fortalece el folículo y reduce la caída. Uso diario.',
      price: 12.99,
      stock: 20,
      category: 'Cabello',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop',
    },
    {
      name: 'Aftershave Bálsamo Calmante',
      description: 'Con aloe vera y mentol. Calma la irritación post-afeitado y refresca la piel al instante.',
      price: 11.50,
      stock: 15,
      category: 'Afeitado',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop',
    },
    {
      name: 'Cera de Abejas Natural',
      description: 'Cera orgánica con fijación ligera y brillo sutil. Sin parabenos ni sulfatos.',
      price: 8.50,
      stock: 30,
      category: 'Styling',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=400&fit=crop',
    },
    {
      name: 'Perfume Woody Signature',
      description: 'Fragancia exclusiva con notas de sándalo, cedro y bergamota. Eau de toilette 50ml.',
      price: 34.99,
      stock: 8,
      category: 'Perfume',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
    },
    {
      name: 'Peine de Madera Artesanal',
      description: 'Peine antiestático de sándalo tallado a mano. No daña el cabello ni genera frizz.',
      price: 7.99,
      stock: 40,
      category: 'Accesorios',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop',
    },
    {
      name: 'Navaja Clásica de Barbero',
      description: 'Navaja de afeitar de acero inoxidable con mango de madera. Incluye 10 cuchillas.',
      price: 24.99,
      stock: 10,
      category: 'Accesorios',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400&h=400&fit=crop',
    },
    {
      name: 'Toalla Caliente Premium',
      description: 'Pack de 3 toallas de algodón egipcio. Perfectas para el ritual de barbería.',
      price: 19.99,
      stock: 6,
      category: 'Accesorios',
      barbershopId: '9YaE6gASsACCSlyhE967',
      photoURL: 'https://images.unsplash.com/photo-1583845112239-97ef1341b271?w=400&h=400&fit=crop',
    },
  ];

  for (const product of products) {
    await addDoc('products', { ...product, createdAt: new Date() });
    console.log(`  ✅ ${product.name} (${product.category})`);
  }
  console.log(`\n✅ ${products.length} productos creados con fotos\n`);

  // ── 3. Actualizar servicios de la barbería (más variados) ───────────────────
  console.log('✂️  Actualizando servicios...');

  // Primero leer la barbería existente para no perder campos
  const shopUrl = `${FIRESTORE_BASE}/barbershops/9YaE6gASsACCSlyhE967`;
  const shopRes = await fetch(shopUrl, { headers });
  if (!shopRes.ok) {
    console.error('❌ No se encontró la barbería Tarik\'s');
    process.exit(1);
  }

  const services = [
    { id: 'svc-1',  name: 'Corte Clásico',         duration: 30, price: 15,  description: 'Corte tradicional con tijera y máquina' },
    { id: 'svc-2',  name: 'Corte Degradado (Fade)', duration: 35, price: 18,  description: 'Low, mid o high fade a tu elección' },
    { id: 'svc-3',  name: 'Arreglo de Barba',       duration: 20, price: 10,  description: 'Perfilado y recorte de barba con navaja' },
    { id: 'svc-4',  name: 'Afeitado Clásico',       duration: 30, price: 15,  description: 'Afeitado a navaja con toalla caliente' },
    { id: 'svc-5',  name: 'Corte + Barba',          duration: 50, price: 25,  description: 'Combo completo: corte y arreglo de barba' },
    { id: 'svc-6',  name: 'Lavado + Corte',         duration: 40, price: 20,  description: 'Lavado con masaje capilar + corte' },
    { id: 'svc-7',  name: 'Tinte de Barba',         duration: 25, price: 12,  description: 'Coloración natural para cubrir canas' },
    { id: 'svc-8',  name: 'Tratamiento Capilar',     duration: 30, price: 22,  description: 'Tratamiento hidratante con keratina' },
    { id: 'svc-9',  name: 'Diseño de Cejas',        duration: 15, price: 8,   description: 'Perfilado de cejas con cera o pinza' },
    { id: 'svc-10', name: 'Pack Novio',              duration: 90, price: 45,  description: 'Corte + barba + afeitado + tratamiento facial' },
  ];

  // Leer doc actual para preservar otros campos
  const shopData = await shopRes.json();
  const currentFields = shopData.fields || {};

  // Reconstruir los campos que queremos preservar
  const updateData = {};

  // Preservar campos existentes que no sean services
  const fieldsToPreserve = ['name', 'address', 'phone', 'email', 'description', 'photoURL',
    'ownerId', 'barbers', 'openingHours', 'slotDuration', 'maxAdvanceDays', 'createdAt',
    'gallery', 'loyaltyConfig', 'bookingSettings', 'notificationSettings'];

  for (const field of fieldsToPreserve) {
    if (currentFields[field]) {
      // Keep the raw Firestore value - we'll set services separately
    }
  }

  // Update only the services array using a field mask
  const updateUrl = `${FIRESTORE_BASE}/barbershops/9YaE6gASsACCSlyhE967?updateMask.fieldPaths=services`;
  const updateBody = JSON.stringify({
    fields: {
      services: toFirestoreValue(services),
    }
  });
  const updateRes = await fetch(updateUrl, { method: 'PATCH', headers, body: updateBody });
  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error('❌ Error actualizando servicios:', err);
  } else {
    for (const svc of services) {
      console.log(`  ✅ ${svc.name} — ${svc.duration}min — ${svc.price}€`);
    }
    console.log(`\n✅ ${services.length} servicios actualizados\n`);
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────
  console.log('🎉 ¡Demo data completo!');
  console.log('──────────────────────────────────────────');
  console.log(`📦 ${products.length} productos con fotos`);
  console.log(`✂️  ${services.length} servicios variados`);
  console.log('──────────────────────────────────────────');
}

seed().catch(err => { console.error('❌', err.message); process.exit(1); });
