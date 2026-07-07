/**
 * seed-full.mjs — Seed masivo para BarberFlow
 * Uso: cd backend && node seed-full.mjs
 *
 * Crea: 2 barberías, 10 usuarios, servicios, productos,
 *       20+ citas, 12 pedidos, 9 reseñas, 11 ventas POS.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECT_ID   = 'barberflow-2026';
const API_KEY      = 'AIzaSyCkJOmEDgREdMNcXZqwRTBmPPPDCsVwkpM';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_BASE      = `https://identitytoolkit.googleapis.com/v1/accounts`;

// ── Leer token del firebase CLI ──────────────────────────────────────────────
const configPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const TOKEN = config.tokens.access_token;

if (Date.now() > (config.tokens.expires_at ?? Infinity) - 30_000) {
  console.error('❌ Token expirado. Ejecuta: npx firebase-tools projects:list');
  process.exit(1);
}

const fsHeaders = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Firestore REST helpers ───────────────────────────────────────────────────

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'string')  return { stringValue: val };
  if (typeof val === 'number')  return val % 1 === 0 ? { integerValue: String(val) } : { doubleValue: val };
  if (val instanceof Date)      return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.length ? val.map(toFirestoreValue) : [] } };
  }
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

async function setDoc(collection, docId, data) {
  const url = `${FIRESTORE_BASE}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: fsHeaders,
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`setDoc ${collection}/${docId}: ${await res.text()}`);
  return res.json();
}

async function addDoc(collection, data) {
  const res = await fetch(`${FIRESTORE_BASE}/${collection}`, {
    method: 'POST',
    headers: fsHeaders,
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`addDoc ${collection}: ${await res.text()}`);
  const json = await res.json();
  return json.name.split('/').pop();
}

// Subcolección: barbershops/{shopId}/services/{svcId}
async function setSubDoc(col1, id1, col2, id2, data) {
  const url = `${FIRESTORE_BASE}/${col1}/${id1}/${col2}/${id2}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: fsHeaders,
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) throw new Error(`setSubDoc ${col1}/${id1}/${col2}/${id2}: ${await res.text()}`);
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function getOrCreateAuthUser(email, password, displayName) {
  // Intenta registrar primero
  const signUpRes = await fetch(`${AUTH_BASE}:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
  });
  const signUpData = await signUpRes.json();
  if (signUpData.localId) {
    console.log(`  ✅ Creado: ${email} → ${signUpData.localId}`);
    return signUpData.localId;
  }

  // EMAIL_EXISTS → hacer signIn
  if (signUpData.error?.message === 'EMAIL_EXISTS') {
    const signInRes = await fetch(`${AUTH_BASE}:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const signInData = await signInRes.json();
    if (signInData.localId) {
      console.log(`  ℹ️  Ya existía: ${email} → ${signInData.localId}`);
      return signInData.localId;
    }
    throw new Error(`signIn failed for ${email}: ${JSON.stringify(signInData.error)}`);
  }

  throw new Error(`Auth error for ${email}: ${JSON.stringify(signUpData.error)}`);
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function withTime(date, timeStr) {
  const d = new Date(date);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function seed() {
  console.log('\n🌱  Iniciando seed masivo BarberFlow...\n');

  // ══════════════════════════════════════════════════════════════════════════
  // 1. CREAR USUARIOS EN FIREBASE AUTH
  // ══════════════════════════════════════════════════════════════════════════
  console.log('👤  Creando usuarios en Firebase Auth...');

  const uids = {};

  uids.carlos  = await getOrCreateAuthUser('cliente@barberflow.dev',  'TestPass123', 'Carlos Cliente');
  uids.laura   = await getOrCreateAuthUser('cliente2@barberflow.dev', 'TestPass123', 'Laura García');
  uids.marcos  = await getOrCreateAuthUser('cliente3@barberflow.dev', 'TestPass123', 'Marcos Ruiz');
  uids.miguel  = await getOrCreateAuthUser('barbero@barberflow.dev',  'TestPass123', 'Miguel Barbero');
  uids.diego   = await getOrCreateAuthUser('barbero2@barberflow.dev', 'TestPass123', 'Diego López');
  uids.sara    = await getOrCreateAuthUser('barbero3@barberflow.dev', 'TestPass123', 'Sara Jiménez');
  uids.andres  = await getOrCreateAuthUser('barbero4@barberflow.dev', 'TestPass123', 'Andrés Moreno');
  uids.pedro   = await getOrCreateAuthUser('dueno@barberflow.dev',    'TestPass123', 'Pedro Dueño');
  uids.ana     = await getOrCreateAuthUser('dueno2@barberflow.dev',   'TestPass123', 'Ana Torres');
  uids.dev     = await getOrCreateAuthUser('dev@barberflow.dev',      'TestPass123', 'Dev Admin');

  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 2. CREAR BARBERÍAS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('🏪  Creando barberías...');

  const shopDemo = {
    name: 'Barbería Demo',
    ownerId: uids.pedro,
    barbers: [uids.miguel, uids.diego],
    address: 'Calle Mayor 15, Madrid',
    phone: '+34 600 000 001',
    description: 'La mejor barbería del barrio. Cortes modernos y clásicos desde 2015.',
    openingHours: {
      monday:    { open: true,  from: '09:00', to: '20:00' },
      tuesday:   { open: true,  from: '09:00', to: '20:00' },
      wednesday: { open: true,  from: '09:00', to: '20:00' },
      thursday:  { open: true,  from: '09:00', to: '20:00' },
      friday:    { open: true,  from: '09:00', to: '20:00' },
      saturday:  { open: true,  from: '09:00', to: '18:00' },
      sunday:    { open: false, from: '00:00', to: '00:00' },
    },
    slotDuration: 30,
    maxAdvanceDays: 14,
    createdAt: daysAgo(180),
  };

  const shopNorte = {
    name: 'Barber Norte',
    ownerId: uids.ana,
    barbers: [uids.sara, uids.andres],
    address: 'Avenida del Norte 42, Barcelona',
    phone: '+34 600 000 002',
    description: 'Barbería premium en el norte de Barcelona. Especialistas en fade y diseño.',
    openingHours: {
      monday:    { open: true,  from: '10:00', to: '20:00' },
      tuesday:   { open: true,  from: '10:00', to: '20:00' },
      wednesday: { open: true,  from: '10:00', to: '20:00' },
      thursday:  { open: true,  from: '10:00', to: '20:00' },
      friday:    { open: true,  from: '10:00', to: '20:00' },
      saturday:  { open: true,  from: '10:00', to: '19:00' },
      sunday:    { open: false, from: '00:00', to: '00:00' },
    },
    slotDuration: 30,
    maxAdvanceDays: 14,
    createdAt: daysAgo(90),
  };

  await setDoc('barbershops', 'barberia-demo',  shopDemo);
  await setDoc('barbershops', 'barberia-norte', shopNorte);
  console.log('  ✅ barberia-demo');
  console.log('  ✅ barberia-norte');
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 3. DOCUMENTOS DE USUARIOS EN FIRESTORE
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📄  Creando perfiles de usuario en Firestore...');

  const now = new Date();

  await setDoc('users', uids.carlos, {
    uid: uids.carlos,
    email: 'cliente@barberflow.dev',
    displayName: 'Carlos Cliente',
    role: 'client',
    phone: '+34 611 111 001',
    loyaltyPoints: 180,
    loyaltyTier: 'Silver',
    referralCode: 'CARLOS2026',
    activeBarbershopId: 'barberia-demo',
    memberships: [{ barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo', role: 'client', joinedAt: daysAgo(120) }],
    createdAt: daysAgo(120),
  });

  await setDoc('users', uids.laura, {
    uid: uids.laura,
    email: 'cliente2@barberflow.dev',
    displayName: 'Laura García',
    role: 'client',
    phone: '+34 611 111 002',
    loyaltyPoints: 45,
    loyaltyTier: 'Bronze',
    referralCode: 'LAURA2026',
    activeBarbershopId: 'barberia-demo',
    memberships: [{ barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo', role: 'client', joinedAt: daysAgo(60) }],
    createdAt: daysAgo(60),
  });

  await setDoc('users', uids.marcos, {
    uid: uids.marcos,
    email: 'cliente3@barberflow.dev',
    displayName: 'Marcos Ruiz',
    role: 'client',
    phone: '+34 611 111 003',
    loyaltyPoints: 320,
    loyaltyTier: 'Gold',
    referralCode: 'MARCOS2026',
    activeBarbershopId: 'barberia-norte',
    memberships: [
      { barbershopId: 'barberia-demo',  barbershopName: 'Barbería Demo', role: 'client', joinedAt: daysAgo(150) },
      { barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',  role: 'client', joinedAt: daysAgo(80) },
    ],
    createdAt: daysAgo(150),
  });

  await setDoc('users', uids.miguel, {
    uid: uids.miguel,
    email: 'barbero@barberflow.dev',
    displayName: 'Miguel Barbero',
    role: 'barber',
    phone: '+34 622 222 001',
    barbershopId: 'barberia-demo',
    activeBarbershopId: 'barberia-demo',
    bio: 'Especialista en fades y barbas. 8 años de experiencia.',
    memberships: [{ barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo', role: 'barber', joinedAt: daysAgo(180) }],
    createdAt: daysAgo(180),
  });

  await setDoc('users', uids.diego, {
    uid: uids.diego,
    email: 'barbero2@barberflow.dev',
    displayName: 'Diego López',
    role: 'barber',
    phone: '+34 622 222 002',
    barbershopId: 'barberia-demo',
    activeBarbershopId: 'barberia-demo',
    bio: 'Cortes clásicos y modernos. Especialista en degradados.',
    memberships: [{ barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo', role: 'barber', joinedAt: daysAgo(160) }],
    createdAt: daysAgo(160),
  });

  await setDoc('users', uids.sara, {
    uid: uids.sara,
    email: 'barbero3@barberflow.dev',
    displayName: 'Sara Jiménez',
    role: 'barber',
    phone: '+34 622 222 003',
    barbershopId: 'barberia-norte',
    activeBarbershopId: 'barberia-norte',
    bio: 'Maestra barbera. Especialista en diseño y coloración.',
    memberships: [{ barbershopId: 'barberia-norte', barbershopName: 'Barber Norte', role: 'barber', joinedAt: daysAgo(90) }],
    createdAt: daysAgo(90),
  });

  await setDoc('users', uids.andres, {
    uid: uids.andres,
    email: 'barbero4@barberflow.dev',
    displayName: 'Andrés Moreno',
    role: 'barber',
    phone: '+34 622 222 004',
    barbershopId: 'barberia-norte',
    activeBarbershopId: 'barberia-norte',
    bio: 'Especialista en afeitado clásico y tratamientos capilares.',
    memberships: [{ barbershopId: 'barberia-norte', barbershopName: 'Barber Norte', role: 'barber', joinedAt: daysAgo(85) }],
    createdAt: daysAgo(85),
  });

  await setDoc('users', uids.pedro, {
    uid: uids.pedro,
    email: 'dueno@barberflow.dev',
    displayName: 'Pedro Dueño',
    role: 'owner',
    phone: '+34 633 333 001',
    barbershopId: 'barberia-demo',
    activeBarbershopId: 'barberia-demo',
    memberships: [{ barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo', role: 'owner', joinedAt: daysAgo(180) }],
    createdAt: daysAgo(180),
  });

  await setDoc('users', uids.ana, {
    uid: uids.ana,
    email: 'dueno2@barberflow.dev',
    displayName: 'Ana Torres',
    role: 'owner',
    phone: '+34 633 333 002',
    barbershopId: 'barberia-norte',
    activeBarbershopId: 'barberia-norte',
    memberships: [{ barbershopId: 'barberia-norte', barbershopName: 'Barber Norte', role: 'owner', joinedAt: daysAgo(90) }],
    createdAt: daysAgo(90),
  });

  await setDoc('users', uids.dev, {
    uid: uids.dev,
    email: 'dev@barberflow.dev',
    displayName: 'Dev Admin',
    role: 'developer',
    phone: '+34 644 444 001',
    createdAt: daysAgo(200),
  });

  console.log('  ✅ 10 perfiles creados');
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 4. SERVICIOS (subcolección services en cada barbería)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('✂️   Creando servicios...');

  const SERVICES = [
    { id: 'svc-corte',      name: 'Corte de pelo',      duration: 30, price: 15 },
    { id: 'svc-afeitado',   name: 'Afeitado',           duration: 20, price: 10 },
    { id: 'svc-cortebarba', name: 'Corte + Barba',      duration: 45, price: 22 },
    { id: 'svc-tratamiento',name: 'Tratamiento capilar', duration: 30, price: 18 },
    { id: 'svc-perfilado',  name: 'Perfilado',          duration: 15, price: 8  },
  ];

  for (const shop of ['barberia-demo', 'barberia-norte']) {
    for (const svc of SERVICES) {
      await setSubDoc('barbershops', shop, 'services', svc.id, {
        ...svc,
        barbershopId: shop,
        createdAt: daysAgo(shop === 'barberia-demo' ? 180 : 90),
      });
    }
  }
  console.log('  ✅ 5 servicios × 2 barberías = 10 servicios');
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 5. PRODUCTOS (subcolección products en cada barbería)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('🛒  Creando productos...');

  const PRODUCTS_DEMO = [
    { id: 'prod-gel',       name: 'Gel Fijador Extra Fuerte',    price: 8.99,  stock: 25, description: 'Fijación máxima todo el día. Sin residuos.' },
    { id: 'prod-pomada',    name: 'Pomada Mate Profesional',     price: 12.50, stock: 18, description: 'Acabado mate natural. Ideal para estilos modernos.' },
    { id: 'prod-aceite',    name: 'Aceite de Barba Premium',     price: 15.99, stock: 0,  description: 'Hidrata y suaviza la barba. Aroma a madera.' },
    { id: 'prod-champu',    name: 'Champú para Barba',           price: 9.99,  stock: 20, description: 'Limpieza profunda sin resecar. pH neutro.' },
    { id: 'prod-aftershave',name: 'Crema Aftershave Calmante',   price: 11.50, stock: 0,  description: 'Calma la irritación post-afeitado. Con aloe vera.' },
  ];

  const PRODUCTS_NORTE = [
    { id: 'prod-cera',      name: 'Cera de Abejas Natural',      price: 7.50,  stock: 30, description: 'Control natural con brillo sutil. Sin químicos.' },
    { id: 'prod-perfume',   name: 'Perfume BarberNorte Signature',price: 29.99, stock: 8,  description: 'Fragancia exclusiva de la barbería. 50ml.' },
    { id: 'prod-peine',     name: 'Peine de Madera Artesanal',   price: 6.99,  stock: 0,  description: 'Peine antiestático de sándalo. No daña el cabello.' },
    { id: 'prod-balsamo',   name: 'Bálsamo Hidratante para Barba',price: 13.99, stock: 15, description: 'Suaviza y nutre la barba seca. Aroma cítrico.' },
  ];

  for (const prod of PRODUCTS_DEMO) {
    await setSubDoc('barbershops', 'barberia-demo', 'products', prod.id, {
      ...prod, barbershopId: 'barberia-demo', createdAt: daysAgo(100),
    });
  }
  for (const prod of PRODUCTS_NORTE) {
    await setSubDoc('barbershops', 'barberia-norte', 'products', prod.id, {
      ...prod, barbershopId: 'barberia-norte', createdAt: daysAgo(60),
    });
  }
  console.log('  ✅ 5 productos en barberia-demo (2 sin stock)');
  console.log('  ✅ 4 productos en barberia-norte (1 sin stock)');
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 6. CITAS (appointments)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📅  Creando citas...');

  const appointmentDefs = [
    // ── 5 COMPLETADAS (barberia-demo, pasadas) ───────────────────────────
    {
      clientId: uids.carlos,    clientName: 'Carlos Cliente',  clientEmail: 'cliente@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte de pelo', price: 15, duration: 30 }],
      timeSlot: '10:00', date: daysAgo(3),  status: 'completed',
      totalPrice: 15, paymentMethod: 'cash', paymentStatus: 'paid',
    },
    {
      clientId: uids.laura,     clientName: 'Laura García',    clientEmail: 'cliente2@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte + Barba', price: 22, duration: 45 }],
      timeSlot: '11:00', date: daysAgo(5),  status: 'completed',
      totalPrice: 22, paymentMethod: 'bizum', paymentStatus: 'paid',
    },
    {
      clientId: uids.marcos,    clientName: 'Marcos Ruiz',     clientEmail: 'cliente3@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Afeitado', price: 10, duration: 20 }],
      timeSlot: '09:00', date: daysAgo(10), status: 'completed',
      totalPrice: 10, paymentMethod: 'tarjeta', paymentStatus: 'paid',
    },
    {
      clientId: uids.carlos,    clientName: 'Carlos Cliente',  clientEmail: 'cliente@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Tratamiento capilar', price: 18, duration: 30 }],
      timeSlot: '15:00', date: daysAgo(15), status: 'completed',
      totalPrice: 18, paymentMethod: 'cash', paymentStatus: 'paid',
    },
    {
      clientId: uids.laura,     clientName: 'Laura García',    clientEmail: 'cliente2@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Perfilado', price: 8, duration: 15 }],
      timeSlot: '16:30', date: daysAgo(25), status: 'completed',
      totalPrice: 8, paymentMethod: 'bizum', paymentStatus: 'paid',
    },

    // ── 3 CANCELADAS (barberia-demo, pasadas) ────────────────────────────
    {
      clientId: uids.marcos,    clientName: 'Marcos Ruiz',     clientEmail: 'cliente3@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte de pelo', price: 15, duration: 30 }],
      timeSlot: '12:00', date: daysAgo(7),  status: 'cancelled',
      totalPrice: 15, paymentMethod: 'cash', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.carlos,    clientName: 'Carlos Cliente',  clientEmail: 'cliente@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte + Barba', price: 22, duration: 45 }],
      timeSlot: '10:30', date: daysAgo(12), status: 'cancelled',
      totalPrice: 22, paymentMethod: 'tarjeta', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.laura,     clientName: 'Laura García',    clientEmail: 'cliente2@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Afeitado', price: 10, duration: 20 }],
      timeSlot: '14:00', date: daysAgo(20), status: 'cancelled',
      totalPrice: 10, paymentMethod: 'bizum', paymentStatus: 'unpaid',
    },

    // ── 4 CONFIRMADAS (barberia-demo, futuras) ───────────────────────────
    {
      clientId: uids.carlos,    clientName: 'Carlos Cliente',  clientEmail: 'cliente@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte de pelo', price: 15, duration: 30 }],
      timeSlot: '10:00', date: daysFromNow(2), status: 'confirmed',
      totalPrice: 15, paymentMethod: 'cash', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.laura,     clientName: 'Laura García',    clientEmail: 'cliente2@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte + Barba', price: 22, duration: 45 }],
      timeSlot: '11:30', date: daysFromNow(3), status: 'confirmed',
      totalPrice: 22, paymentMethod: 'bizum', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.marcos,    clientName: 'Marcos Ruiz',     clientEmail: 'cliente3@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Tratamiento capilar', price: 18, duration: 30 }],
      timeSlot: '09:30', date: daysFromNow(5), status: 'confirmed',
      totalPrice: 18, paymentMethod: 'tarjeta', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.carlos,    clientName: 'Carlos Cliente',  clientEmail: 'cliente@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Perfilado', price: 8, duration: 15 }],
      timeSlot: '17:00', date: daysFromNow(7), status: 'confirmed',
      totalPrice: 8, paymentMethod: 'cash', paymentStatus: 'unpaid',
    },

    // ── 3 PENDIENTES (barberia-demo, futuras) ────────────────────────────
    {
      clientId: uids.laura,     clientName: 'Laura García',    clientEmail: 'cliente2@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Afeitado', price: 10, duration: 20 }],
      timeSlot: '13:00', date: daysFromNow(1), status: 'pending',
      totalPrice: 10, paymentMethod: 'cash', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.marcos,    clientName: 'Marcos Ruiz',     clientEmail: 'cliente3@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte de pelo', price: 15, duration: 30 }],
      timeSlot: '16:00', date: daysFromNow(4), status: 'pending',
      totalPrice: 15, paymentMethod: 'bizum', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.carlos,    clientName: 'Carlos Cliente',  clientEmail: 'cliente@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte + Barba', price: 22, duration: 45 }],
      timeSlot: '10:00', date: daysFromNow(6), status: 'pending',
      totalPrice: 22, paymentMethod: 'tarjeta', paymentStatus: 'unpaid',
    },

    // ── 2 NO-SHOW (barberia-demo, pasadas) ───────────────────────────────
    {
      clientId: uids.marcos,    clientName: 'Marcos Ruiz',     clientEmail: 'cliente3@barberflow.dev',
      barberId: uids.miguel,    barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Corte de pelo', price: 15, duration: 30 }],
      timeSlot: '09:00', date: daysAgo(2),  status: 'no_show',
      totalPrice: 15, paymentMethod: 'cash', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.laura,     clientName: 'Laura García',    clientEmail: 'cliente2@barberflow.dev',
      barberId: uids.diego,     barberName: 'Diego López',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      services: [{ name: 'Afeitado', price: 10, duration: 20 }],
      timeSlot: '14:30', date: daysAgo(8),  status: 'no_show',
      totalPrice: 10, paymentMethod: 'bizum', paymentStatus: 'unpaid',
    },

    // ── 3 PARA BARBERIA-NORTE ────────────────────────────────────────────
    {
      clientId: uids.marcos,    clientName: 'Marcos Ruiz',     clientEmail: 'cliente3@barberflow.dev',
      barberId: uids.sara,      barberName: 'Sara Jiménez',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      services: [{ name: 'Corte + Barba', price: 22, duration: 45 }],
      timeSlot: '11:00', date: daysAgo(4),  status: 'completed',
      totalPrice: 22, paymentMethod: 'tarjeta', paymentStatus: 'paid',
    },
    {
      clientId: uids.carlos,    clientName: 'Carlos Cliente',  clientEmail: 'cliente@barberflow.dev',
      barberId: uids.andres,    barberName: 'Andrés Moreno',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      services: [{ name: 'Perfilado', price: 8, duration: 15 }],
      timeSlot: '12:30', date: daysFromNow(3), status: 'confirmed',
      totalPrice: 8, paymentMethod: 'cash', paymentStatus: 'unpaid',
    },
    {
      clientId: uids.laura,     clientName: 'Laura García',    clientEmail: 'cliente2@barberflow.dev',
      barberId: uids.sara,      barberName: 'Sara Jiménez',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      services: [{ name: 'Tratamiento capilar', price: 18, duration: 30 }],
      timeSlot: '15:00', date: daysFromNow(5), status: 'pending',
      totalPrice: 18, paymentMethod: 'bizum', paymentStatus: 'unpaid',
    },
  ];

  let aptCount = 0;
  for (const apt of appointmentDefs) {
    const dateWithTime = withTime(apt.date, apt.timeSlot);
    await addDoc('appointments', { ...apt, date: dateWithTime, createdAt: new Date() });
    aptCount++;
  }

  const completed  = appointmentDefs.filter(a => a.status === 'completed').length;
  const cancelled  = appointmentDefs.filter(a => a.status === 'cancelled').length;
  const confirmed  = appointmentDefs.filter(a => a.status === 'confirmed' && a.barbershopId === 'barberia-demo').length;
  const pending    = appointmentDefs.filter(a => a.status === 'pending'   && a.barbershopId === 'barberia-demo').length;
  const noshow     = appointmentDefs.filter(a => a.status === 'no_show').length;
  const norte      = appointmentDefs.filter(a => a.barbershopId === 'barberia-norte').length;

  console.log(`  ✅ ${aptCount} citas (${completed} completadas, ${cancelled} canceladas, ${confirmed} confirmadas, ${pending} pendientes, ${noshow} no-show, ${norte} norte)`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 7. PEDIDOS DEL SHOP (orders)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('📦  Creando pedidos del shop...');

  const orderDefs = [
    {
      clientId: uids.carlos, clientName: 'Carlos Cliente', clientEmail: 'cliente@barberflow.dev',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      items: [{ productId: 'prod-gel', name: 'Gel Fijador Extra Fuerte', price: 8.99, quantity: 2 }],
      totalAmount: 17.98, status: 'delivered',
      address: 'Calle Mayor 15, Madrid', createdAt: daysAgo(20),
    },
    {
      clientId: uids.laura, clientName: 'Laura García', clientEmail: 'cliente2@barberflow.dev',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      items: [
        { productId: 'prod-pomada', name: 'Pomada Mate Profesional', price: 12.50, quantity: 1 },
        { productId: 'prod-champu', name: 'Champú para Barba',       price: 9.99,  quantity: 1 },
      ],
      totalAmount: 22.49, status: 'delivered',
      address: 'Avenida de la Paz 8, Madrid', createdAt: daysAgo(18),
    },
    {
      clientId: uids.marcos, clientName: 'Marcos Ruiz', clientEmail: 'cliente3@barberflow.dev',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      items: [{ productId: 'prod-aftershave', name: 'Crema Aftershave Calmante', price: 11.50, quantity: 3 }],
      totalAmount: 34.50, status: 'shipped',
      address: 'Plaza España 3, Madrid', createdAt: daysAgo(10),
    },
    {
      clientId: uids.carlos, clientName: 'Carlos Cliente', clientEmail: 'cliente@barberflow.dev',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      items: [
        { productId: 'prod-gel',    name: 'Gel Fijador Extra Fuerte', price: 8.99,  quantity: 1 },
        { productId: 'prod-aceite', name: 'Aceite de Barba Premium',  price: 15.99, quantity: 1 },
      ],
      totalAmount: 24.98, status: 'shipped',
      address: 'Calle Mayor 15, Madrid', createdAt: daysAgo(8),
    },
    {
      clientId: uids.laura, clientName: 'Laura García', clientEmail: 'cliente2@barberflow.dev',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      items: [{ productId: 'prod-pomada', name: 'Pomada Mate Profesional', price: 12.50, quantity: 2 }],
      totalAmount: 25.00, status: 'confirmed',
      address: 'Avenida de la Paz 8, Madrid', createdAt: daysAgo(5),
    },
    {
      clientId: uids.marcos, clientName: 'Marcos Ruiz', clientEmail: 'cliente3@barberflow.dev',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      items: [{ productId: 'prod-champu', name: 'Champú para Barba', price: 9.99, quantity: 2 }],
      totalAmount: 19.98, status: 'confirmed',
      address: 'Plaza España 3, Madrid', createdAt: daysAgo(3),
    },
    {
      clientId: uids.carlos, clientName: 'Carlos Cliente', clientEmail: 'cliente@barberflow.dev',
      barbershopId: 'barberia-demo', barbershopName: 'Barbería Demo',
      items: [{ productId: 'prod-gel', name: 'Gel Fijador Extra Fuerte', price: 8.99, quantity: 1 }],
      totalAmount: 8.99, status: 'pending',
      address: 'Calle Mayor 15, Madrid', createdAt: daysAgo(2),
    },
    // Norte
    {
      clientId: uids.marcos, clientName: 'Marcos Ruiz', clientEmail: 'cliente3@barberflow.dev',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      items: [{ productId: 'prod-perfume', name: 'Perfume BarberNorte Signature', price: 29.99, quantity: 1 }],
      totalAmount: 29.99, status: 'delivered',
      address: 'Calle Bruc 10, Barcelona', createdAt: daysAgo(15),
    },
    {
      clientId: uids.laura, clientName: 'Laura García', clientEmail: 'cliente2@barberflow.dev',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      items: [
        { productId: 'prod-cera',    name: 'Cera de Abejas Natural',       price: 7.50,  quantity: 2 },
        { productId: 'prod-balsamo', name: 'Bálsamo Hidratante para Barba', price: 13.99, quantity: 1 },
      ],
      totalAmount: 28.99, status: 'delivered',
      address: 'Paseo de Gracia 44, Barcelona', createdAt: daysAgo(12),
    },
    {
      clientId: uids.carlos, clientName: 'Carlos Cliente', clientEmail: 'cliente@barberflow.dev',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      items: [{ productId: 'prod-peine', name: 'Peine de Madera Artesanal', price: 6.99, quantity: 1 }],
      totalAmount: 6.99, status: 'shipped',
      address: 'Calle Mayor 15, Madrid', createdAt: daysAgo(6),
    },
    {
      clientId: uids.marcos, clientName: 'Marcos Ruiz', clientEmail: 'cliente3@barberflow.dev',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      items: [{ productId: 'prod-balsamo', name: 'Bálsamo Hidratante para Barba', price: 13.99, quantity: 2 }],
      totalAmount: 27.98, status: 'confirmed',
      address: 'Calle Bruc 10, Barcelona', createdAt: daysAgo(1),
    },
    {
      clientId: uids.laura, clientName: 'Laura García', clientEmail: 'cliente2@barberflow.dev',
      barbershopId: 'barberia-norte', barbershopName: 'Barber Norte',
      items: [{ productId: 'prod-cera', name: 'Cera de Abejas Natural', price: 7.50, quantity: 3 }],
      totalAmount: 22.50, status: 'pending',
      address: 'Paseo de Gracia 44, Barcelona', createdAt: new Date(),
    },
  ];

  for (const order of orderDefs) {
    await addDoc('orders', order);
  }
  console.log(`  ✅ ${orderDefs.length} pedidos creados`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 8. RESEÑAS (reviews)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('⭐  Creando reseñas...');

  const reviewDefs = [
    {
      clientId: uids.carlos, clientName: 'Carlos Cliente',
      barberId: uids.miguel, barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', rating: 5,
      comment: 'Excelente corte, quedé muy satisfecho. Miguel es un auténtico profesional, sabe exactamente lo que quieres.',
      createdAt: daysAgo(3),
    },
    {
      clientId: uids.laura, clientName: 'Laura García',
      barberId: uids.diego, barberName: 'Diego López',
      barbershopId: 'barberia-demo', rating: 4,
      comment: 'Muy buen trabajo con el corte y la barba. La atención fue genial, aunque tardó un poco más de lo esperado.',
      createdAt: daysAgo(5),
    },
    {
      clientId: uids.marcos, clientName: 'Marcos Ruiz',
      barberId: uids.miguel, barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', rating: 5,
      comment: 'El mejor afeitado clásico que he tenido. Uso espuma caliente, navaja y toalla caliente. Impecable.',
      createdAt: daysAgo(10),
    },
    {
      clientId: uids.carlos, clientName: 'Carlos Cliente',
      barberId: uids.diego, barberName: 'Diego López',
      barbershopId: 'barberia-demo', rating: 4,
      comment: 'El tratamiento capilar fue muy relajante. Notaré los resultados en unos días. Ambiente muy agradable.',
      createdAt: daysAgo(15),
    },
    {
      clientId: uids.laura, clientName: 'Laura García',
      barberId: uids.miguel, barberName: 'Miguel Barbero',
      barbershopId: 'barberia-demo', rating: 5,
      comment: 'El perfilado quedó perfecto. Siempre un placer venir a esta barbería. Lo recomiendo sin dudarlo.',
      createdAt: daysAgo(25),
    },
    {
      clientId: uids.marcos, clientName: 'Marcos Ruiz',
      barberId: uids.diego, barberName: 'Diego López',
      barbershopId: 'barberia-demo', rating: 3,
      comment: 'El resultado del corte fue correcto pero el tiempo de espera fue mayor de lo esperado. Mejorable.',
      createdAt: daysAgo(18),
    },
    // Norte
    {
      clientId: uids.marcos, clientName: 'Marcos Ruiz',
      barberId: uids.sara, barberName: 'Sara Jiménez',
      barbershopId: 'barberia-norte', rating: 5,
      comment: 'Sara es increíble. El corte y barba quedaron perfectos. Las instalaciones son de primera.',
      createdAt: daysAgo(4),
    },
    {
      clientId: uids.carlos, clientName: 'Carlos Cliente',
      barberId: uids.andres, barberName: 'Andrés Moreno',
      barbershopId: 'barberia-norte', rating: 4,
      comment: 'Andrés tiene mucha mano para los perfilados. Muy buena vibra en la barbería. Repetiré seguro.',
      createdAt: daysAgo(11),
    },
    {
      clientId: uids.laura, clientName: 'Laura García',
      barberId: uids.sara, barberName: 'Sara Jiménez',
      barbershopId: 'barberia-norte', rating: 5,
      comment: 'El tratamiento capilar fue alucinante. Sara domina perfectamente las técnicas. Diez de diez.',
      createdAt: daysAgo(22),
    },
  ];

  for (const review of reviewDefs) {
    await addDoc('reviews', review);
  }
  console.log(`  ✅ ${reviewDefs.length} reseñas creadas`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 9. VENTAS POS (sales)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('💰  Creando ventas POS...');

  const saleDefs = [
    {
      barberId: uids.miguel, barberName: 'Miguel Barbero', barbershopId: 'barberia-demo',
      items: [{ type: 'service', name: 'Corte de pelo', price: 15, quantity: 1 }],
      totalAmount: 15, paymentMethod: 'cash', date: daysAgo(1), createdAt: daysAgo(1),
    },
    {
      barberId: uids.diego, barberName: 'Diego López', barbershopId: 'barberia-demo',
      items: [
        { type: 'service', name: 'Corte + Barba', price: 22, quantity: 1 },
        { type: 'product', name: 'Pomada Mate Profesional', price: 12.50, quantity: 1 },
      ],
      totalAmount: 34.50, paymentMethod: 'bizum', date: daysAgo(2), createdAt: daysAgo(2),
    },
    {
      barberId: uids.miguel, barberName: 'Miguel Barbero', barbershopId: 'barberia-demo',
      items: [{ type: 'service', name: 'Afeitado', price: 10, quantity: 1 }],
      totalAmount: 10, paymentMethod: 'tarjeta', date: daysAgo(3), createdAt: daysAgo(3),
    },
    {
      barberId: uids.diego, barberName: 'Diego López', barbershopId: 'barberia-demo',
      items: [
        { type: 'service', name: 'Tratamiento capilar', price: 18, quantity: 1 },
        { type: 'product', name: 'Gel Fijador Extra Fuerte', price: 8.99, quantity: 2 },
      ],
      totalAmount: 35.98, paymentMethod: 'cash', date: daysAgo(5), createdAt: daysAgo(5),
    },
    {
      barberId: uids.miguel, barberName: 'Miguel Barbero', barbershopId: 'barberia-demo',
      items: [{ type: 'service', name: 'Corte de pelo', price: 15, quantity: 1 }],
      totalAmount: 15, paymentMethod: 'bizum', date: daysAgo(6), createdAt: daysAgo(6),
    },
    {
      barberId: uids.diego, barberName: 'Diego López', barbershopId: 'barberia-demo',
      items: [
        { type: 'service', name: 'Perfilado', price: 8, quantity: 1 },
        { type: 'product', name: 'Aceite de Barba Premium', price: 15.99, quantity: 1 },
      ],
      totalAmount: 23.99, paymentMethod: 'tarjeta', date: daysAgo(8), createdAt: daysAgo(8),
    },
    {
      barberId: uids.miguel, barberName: 'Miguel Barbero', barbershopId: 'barberia-demo',
      items: [{ type: 'service', name: 'Corte + Barba', price: 22, quantity: 1 }],
      totalAmount: 22, paymentMethod: 'cash', date: daysAgo(10), createdAt: daysAgo(10),
    },
    {
      barberId: uids.diego, barberName: 'Diego López', barbershopId: 'barberia-demo',
      items: [{ type: 'service', name: 'Corte de pelo', price: 15, quantity: 1 }],
      totalAmount: 15, paymentMethod: 'bizum', date: daysAgo(12), createdAt: daysAgo(12),
    },
    // Norte
    {
      barberId: uids.sara, barberName: 'Sara Jiménez', barbershopId: 'barberia-norte',
      items: [{ type: 'service', name: 'Corte + Barba', price: 22, quantity: 1 }],
      totalAmount: 22, paymentMethod: 'tarjeta', date: daysAgo(4), createdAt: daysAgo(4),
    },
    {
      barberId: uids.andres, barberName: 'Andrés Moreno', barbershopId: 'barberia-norte',
      items: [
        { type: 'service', name: 'Perfilado', price: 8, quantity: 1 },
        { type: 'product', name: 'Cera de Abejas Natural', price: 7.50, quantity: 1 },
      ],
      totalAmount: 15.50, paymentMethod: 'cash', date: daysAgo(7), createdAt: daysAgo(7),
    },
    {
      barberId: uids.sara, barberName: 'Sara Jiménez', barbershopId: 'barberia-norte',
      items: [{ type: 'service', name: 'Tratamiento capilar', price: 18, quantity: 1 }],
      totalAmount: 18, paymentMethod: 'bizum', date: daysAgo(9), createdAt: daysAgo(9),
    },
  ];

  for (const sale of saleDefs) {
    await addDoc('sales', sale);
  }
  console.log(`  ✅ ${saleDefs.length} ventas POS creadas`);
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // 10. CONFIGURACIÓN DE LOYALTY
  // ══════════════════════════════════════════════════════════════════════════
  console.log('🏆  Configurando loyalty...');

  for (const shopId of ['barberia-demo', 'barberia-norte']) {
    await setDoc('loyaltySettings', shopId, {
      barbershopId: shopId,
      pointsPerEuro: 1,
      tiers: [
        { name: 'Bronze',   minPoints: 0,   discount: 0,  color: '#CD7F32' },
        { name: 'Silver',   minPoints: 100, discount: 5,  color: '#C0C0C0' },
        { name: 'Gold',     minPoints: 300, discount: 10, color: '#FFD700' },
        { name: 'Platinum', minPoints: 600, discount: 15, color: '#E5E4E2' },
      ],
      updatedAt: now,
    });
  }

  // Loyalty records por cliente
  await setDoc('loyalty', `${uids.carlos}_barberia-demo`, {
    userId: uids.carlos, barbershopId: 'barberia-demo',
    points: 180, tier: 'Silver', totalSpent: 180, visitCount: 12, updatedAt: now,
  });
  await setDoc('loyalty', `${uids.laura}_barberia-demo`, {
    userId: uids.laura, barbershopId: 'barberia-demo',
    points: 45, tier: 'Bronze', totalSpent: 45, visitCount: 3, updatedAt: now,
  });
  await setDoc('loyalty', `${uids.marcos}_barberia-demo`, {
    userId: uids.marcos, barbershopId: 'barberia-demo',
    points: 320, tier: 'Gold', totalSpent: 320, visitCount: 21, updatedAt: now,
  });
  await setDoc('loyalty', `${uids.marcos}_barberia-norte`, {
    userId: uids.marcos, barbershopId: 'barberia-norte',
    points: 80, tier: 'Bronze', totalSpent: 80, visitCount: 5, updatedAt: now,
  });

  console.log('  ✅ Loyalty configurado (Carlos 180pts Silver, Laura 45pts Bronze, Marcos 320pts Gold)');
  console.log('');

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ══════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎉  Seed completo!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`BARBERÍAS: 2`);
  console.log(`USUARIOS:  10 (3 clientes, 4 barberos, 2 owners, 1 dev)`);
  console.log(`SERVICIOS: 10 (5 × 2 barberías)`);
  console.log(`PRODUCTOS: 9 (5 barberia-demo, 4 barberia-norte; 3 sin stock)`);
  console.log(`CITAS:     ${aptCount} (${completed} completadas, ${cancelled} canceladas, ${confirmed} confirmadas, ${pending} pendientes, ${noshow} no-show, ${norte} norte)`);
  console.log(`PEDIDOS:   ${orderDefs.length} · RESEÑAS: ${reviewDefs.length} · VENTAS: ${saleDefs.length}`);
  console.log('');
  console.log('CUENTAS');
  console.log('───────────────────────────────────────────────────────────────');
  console.log('  cliente@barberflow.dev   / TestPass123  — Carlos Cliente  (180 pts Silver)');
  console.log('  cliente2@barberflow.dev  / TestPass123  — Laura García    (45 pts Bronze)');
  console.log('  cliente3@barberflow.dev  / TestPass123  — Marcos Ruiz     (320 pts Gold)');
  console.log('  barbero@barberflow.dev   / TestPass123  — Miguel Barbero  → barberia-demo');
  console.log('  barbero2@barberflow.dev  / TestPass123  — Diego López     → barberia-demo');
  console.log('  barbero3@barberflow.dev  / TestPass123  — Sara Jiménez    → barberia-norte');
  console.log('  barbero4@barberflow.dev  / TestPass123  — Andrés Moreno   → barberia-norte');
  console.log('  dueno@barberflow.dev     / TestPass123  — Pedro Dueño     → barberia-demo');
  console.log('  dueno2@barberflow.dev    / TestPass123  — Ana Torres      → barberia-norte');
  console.log('  dev@barberflow.dev       / TestPass123  — Dev Admin       (developer)');
  console.log('═══════════════════════════════════════════════════════════════');
}

seed().catch(err => {
  console.error('\n❌ Error en el seed:', err.message);
  process.exit(1);
});
