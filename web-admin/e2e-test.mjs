/**
 * E2E test script — BarberFlow Admin Panel
 * Prueba login + todas las páginas nuevas con cada rol
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'https://barberflow-2026.web.app';
const SHOTS = 'D:/Descargas/Projects/BarberAPP/web-admin/e2e-screenshots';
mkdirSync(SHOTS, { recursive: true });

const ACCOUNTS = [
  { email: 'dueno@barberflow.dev',    pass: 'TestPass123', role: 'owner',     label: 'Dueño' },
  { email: 'barbero@barberflow.dev',  pass: 'TestPass123', role: 'barber',    label: 'Barbero' },
  { email: 'dev@barberflow.dev',      pass: 'TestPass123', role: 'developer', label: 'Developer' },
];

const OWNER_PAGES = [
  { path: '/dashboard',    name: 'Dashboard' },
  { path: '/appointments', name: 'Citas' },
  { path: '/orders',       name: 'Pedidos Shop' },
  { path: '/sales',        name: 'Ventas POS' },
  { path: '/promos',       name: 'Promociones' },
  { path: '/reviews',      name: 'Reseñas' },
  { path: '/inventory',    name: 'Inventario' },
  { path: '/services',     name: 'Servicios' },
  { path: '/barbers',      name: 'Barberos' },
  { path: '/reports',      name: 'Informes' },
];

const BARBER_PAGES = [
  { path: '/dashboard',    name: 'Dashboard' },
  { path: '/appointments', name: 'Citas' },
  { path: '/sales',        name: 'Ventas POS' },
];

const DEV_PAGES = [
  { path: '/dashboard',    name: 'Dashboard' },
  { path: '/barbershops',  name: 'Barberías' },
  { path: '/users',        name: 'Usuarios' },
  { path: '/orders',       name: 'Pedidos Shop' },
  { path: '/reviews',      name: 'Reseñas' },
];

async function loginAs(page, email, pass) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // Cambiar a email/password
  await page.click('text=Email y contraseña');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');

  // Esperar redirect al dashboard
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 });
  console.log(`  ✅ Login OK: ${email}`);
}

async function testPage(page, path, name, prefix) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500); // Dar tiempo a cargar datos

    const title = await page.title();
    const url = page.url();

    // Captura screenshot
    const filename = `${SHOTS}/${prefix}_${name.replace(/\s/g, '_')}.png`;
    await page.screenshot({ path: filename, fullPage: false });

    // Verificar que no hay errores evidentes
    const hasError = await page.locator('text=Error').count() > 0;
    const hasLoading = await page.locator('text=Cargando...').count() > 0;
    const isEmpty = await page.locator('text=No hay').count() > 0;

    console.log(`  ${hasError ? '❌' : '✅'} ${name} — ${url.includes(path) ? 'OK' : 'REDIRECT'}${hasLoading ? ' [cargando]' : ''}${isEmpty ? ' [vacío]' : ''}${hasError ? ' [ERROR]' : ''}`);
    return { name, ok: !hasError && url.includes(path), screenshot: filename };
  } catch (err) {
    console.log(`  ❌ ${name} — ERROR: ${err.message}`);
    return { name, ok: false, error: err.message };
  }
}

async function logout(page) {
  try {
    await page.click('text=Cerrar sesión');
    await page.waitForURL(`${BASE}/login`, { timeout: 8000 });
    console.log('  🚪 Logout OK\n');
  } catch {
    await page.goto(`${BASE}/login`);
    console.log('  🚪 Logout (forzado)\n');
  }
}

async function main() {
  console.log('🧪 BarberFlow Admin — E2E Test\n');
  console.log(`📸 Screenshots → ${SHOTS}\n`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/adpar/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
  });

  const results = {};

  for (const account of ACCOUNTS) {
    console.log(`\n──────────────────────────────`);
    console.log(`👤 ${account.label} (${account.email})`);
    console.log(`──────────────────────────────`);

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Suprimir errores de consola del browser
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`     [browser error] ${msg.text().slice(0, 100)}`);
    });

    try {
      await loginAs(page, account.email, account.pass);

      const pages =
        account.role === 'owner'     ? OWNER_PAGES :
        account.role === 'barber'    ? BARBER_PAGES :
        DEV_PAGES;

      results[account.role] = [];
      for (const p of pages) {
        const r = await testPage(page, p.path, p.name, account.role);
        results[account.role].push(r);
      }

      await logout(page);
    } catch (err) {
      console.log(`  ❌ Error con ${account.label}: ${err.message}`);
    }

    await context.close();
  }

  await browser.close();

  // Resumen final
  console.log('\n══════════════════════════════');
  console.log('📊 RESUMEN');
  console.log('══════════════════════════════');
  for (const [role, pages] of Object.entries(results)) {
    const ok = pages.filter(p => p.ok).length;
    console.log(`${role.padEnd(12)} ${ok}/${pages.length} páginas OK`);
  }
  console.log('══════════════════════════════\n');
  console.log(`📸 Screenshots guardados en: ${SHOTS}`);
}

main().catch(err => {
  console.error('❌ Test falló:', err.message);
  process.exit(1);
});
