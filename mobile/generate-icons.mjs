/**
 * generate-icons.mjs — BarberFlow app icon generator
 *
 * Uses the real brand logo (Logotransparente2.png) to produce all
 * required Expo / Android / iOS asset sizes.
 *
 * Usage:  node generate-icons.mjs
 * Req.:   npm install sharp  (already installed as devDependency)
 */
import sharp from 'sharp';
import path  from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS    = path.join(__dirname, 'assets');
const LOGO      = path.join(ASSETS, 'logo.png');   // Logotransparente2 copy

// ── Brand colors ───────────────────────────────────────────────────────────────
const DARK_BG  = { r: 10,  g: 10,  b: 10,  alpha: 255 };  // #0A0A0A
const CREAM_BG = { r: 245, g: 242, b: 235, alpha: 255 };  // warm cream — logo was designed for light bg

// ── Helper: log ────────────────────────────────────────────────────────────────
const log = (file, px) =>
  console.log(`  ✓  ${path.basename(file).padEnd(42)} ${px}×${px} px`);

// ── 1. icon.png / splash-icon.png / favicon.png ───────────────────────────────
// Solid cream background + logo centred.
// iOS and Android apply their own rounded/squircle mask — we just need opaque pixels.
/**
 * Cleans the logo by scanning every pixel:
 *   - Transparent or light pixels (luminance ≥ 0.70) → replaced with `bg`
 *   - Dark pixels (logo elements) → kept as-is, forced fully opaque
 * Returns a Buffer of a solid-background PNG with no alpha channel.
 *
 * This removes the checkerboard pattern baked into Logotransparente2.png.
 */
async function cleanLogo(bg = CREAM_BG) {
  // Read as RGBA raw pixels, trim first
  const { data, info } = await sharp(LOGO)
    .trim({ threshold: 10 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.allocUnsafe(width * height * 3);  // RGB output (no alpha)

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];

    // Perceived luminance
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (a < 30 || lum > 0.70) {
      // Transparent or checkerboard-light pixel → background colour
      out[i * 3]     = bg.r;
      out[i * 3 + 1] = bg.g;
      out[i * 3 + 2] = bg.b;
    } else {
      // Logo dark element → keep original colour, fully opaque
      out[i * 3]     = r;
      out[i * 3 + 1] = g;
      out[i * 3 + 2] = b;
    }
  }

  return sharp(out, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/** Logo cleaned, resized to targetSize square (opaque, cream bg) */
async function prepLogoOpaque(targetSize) {
  const cleaned = await cleanLogo(CREAM_BG);
  return sharp(cleaned)
    .resize(targetSize, targetSize, { fit: 'contain', background: CREAM_BG })
    .png()
    .toBuffer();
}

/** Logo as white silhouette on black — for Android monochrome (themed) icons */
async function prepLogoDark(targetSize) {
  const cleaned = await cleanLogo(CREAM_BG);   // dark elements on cream
  return sharp(cleaned)
    .resize(targetSize, targetSize, { fit: 'contain', background: CREAM_BG })
    .grayscale()        // → shades of grey
    .negate()           // invert: dark logo → white, cream bg → black
    .threshold(90)      // binarise: > 90 → pure white, ≤ 90 → pure black
    .png()
    .toBuffer();
}

/** Logo on transparent bg (for Android adaptive foreground) */
async function prepLogoTransparent(targetSize) {
  // Use the cleaned opaque version, then restore transparency around the badge
  const cleaned = await cleanLogo(CREAM_BG);
  // Anything that became cream → make transparent
  const { data, info } = await sharp(cleaned).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const out = Buffer.allocUnsafe(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    out[i * 4]     = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = lum > 0.88 ? 0 : 255;   // cream → transparent, dark → opaque
  }
  const withAlpha = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return sharp(withAlpha)
    .resize(targetSize, targetSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function genIcon(outPath, outPx) {
  const logoSize = Math.round(outPx * 0.80);
  const pad      = Math.floor((outPx - logoSize) / 2);
  const logoData = await prepLogoOpaque(logoSize);

  // Solid cream canvas — iOS/Android apply their own squircle / adaptive mask
  await sharp({ create: { width: outPx, height: outPx, channels: 3, background: CREAM_BG } })
    .composite([{ input: logoData, top: pad, left: pad }])
    .flatten({ background: CREAM_BG })  // guarantee no stray alpha channel
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  log(outPath, outPx);
}

// ── 2. android-icon-foreground.png — logo on transparent bg (safe-zone) ───────
async function genForeground(outPath, outPx) {
  const logoSize = Math.round(outPx * 0.70);
  const pad      = Math.floor((outPx - logoSize) / 2);
  const logoData = await prepLogoTransparent(logoSize);

  await sharp({ create: { width: outPx, height: outPx, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logoData, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  log(outPath, outPx);
}

// ── 3. android-icon-background.png — solid dark square ────────────────────────
async function genBackground(outPath, outPx) {
  await sharp({ create: { width: outPx, height: outPx, channels: 4, background: CREAM_BG } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  log(outPath, outPx);
}

// ── 4. android-icon-monochrome.png — white silhouette on black ────────────────
// Android Themed Icons use this as a single-colour mask (system tints it).
async function genMonochrome(outPath, outPx) {
  const logoSize = Math.round(outPx * 0.70);
  const pad      = Math.floor((outPx - logoSize) / 2);

  // Invert the logo so dark→white, keep alpha intact
  const invertedLogo = await prepLogoDark(logoSize);

  await sharp({ create: { width: outPx, height: outPx, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite([{ input: invertedLogo, top: pad, left: pad }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  log(outPath, outPx);
}

// ── Android mipmap WebP files ─────────────────────────────────────────────────
// These are the actual launcher icons read by the installed APK.
// Must be regenerated here because `npx expo prebuild` would be needed
// otherwise and that clears custom native changes.
//
// launcher px  → ic_launcher.webp + ic_launcher_round.webp  (legacy / fallback)
// adaptive px  → ic_launcher_foreground/background/monochrome.webp (Android 8+)
const MIPMAP_SIZES = {
  'mipmap-mdpi':    { launcher: 48,  adaptive: 108 },
  'mipmap-hdpi':    { launcher: 72,  adaptive: 162 },
  'mipmap-xhdpi':   { launcher: 96,  adaptive: 216 },
  'mipmap-xxhdpi':  { launcher: 144, adaptive: 324 },
  'mipmap-xxxhdpi': { launcher: 192, adaptive: 432 },
};

const RES = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

async function genWebP(srcBuffer, outPath, px) {
  await sharp(srcBuffer)
    .resize(px, px, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 95 })
    .toFile(outPath);
  const label = path.relative(path.join(RES, '..'), outPath).padEnd(55);
  console.log(`  ✓  ${label}  ${px}×${px}`);
}

async function genAndroidMipmap() {
  console.log('\n📱  Writing Android mipmap WebP files...\n');

  // Load the full-size source buffers from already-generated assets/
  const [iconBuf, fgBuf, monoBuf] = await Promise.all([
    sharp(path.join(ASSETS, 'icon.png')).png().toBuffer(),
    sharp(path.join(ASSETS, 'android-icon-foreground.png')).png().toBuffer(),
    sharp(path.join(ASSETS, 'android-icon-monochrome.png')).png().toBuffer(),
  ]);

  // Solid cream buffer for background layers
  const bgBuf = await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: CREAM_BG },
  }).png().toBuffer();

  for (const [folder, { launcher: lPx, adaptive: aPx }] of Object.entries(MIPMAP_SIZES)) {
    const dir = path.join(RES, folder);

    // Legacy square launcher icon
    await genWebP(iconBuf, path.join(dir, 'ic_launcher.webp'),            lPx);
    // Legacy round launcher icon (Android applies round mask; same source is fine)
    await genWebP(iconBuf, path.join(dir, 'ic_launcher_round.webp'),      lPx);
    // Adaptive foreground (logo on transparent)
    await genWebP(fgBuf,   path.join(dir, 'ic_launcher_foreground.webp'), aPx);
    // Adaptive background (solid cream)
    await genWebP(bgBuf,   path.join(dir, 'ic_launcher_background.webp'), aPx);
    // Themed monochrome
    await genWebP(monoBuf, path.join(dir, 'ic_launcher_monochrome.webp'), aPx);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n🪒  BarberFlow — generating icons from brand logo\n');

// 1. Expo asset files (used by app.json / Metro)
await genIcon(        path.join(ASSETS, 'icon.png'),                    1024);
await genForeground(  path.join(ASSETS, 'android-icon-foreground.png'), 1024);
await genBackground(  path.join(ASSETS, 'android-icon-background.png'), 1024);
await genMonochrome(  path.join(ASSETS, 'android-icon-monochrome.png'), 1024);
await genIcon(        path.join(ASSETS, 'splash-icon.png'),              512);
await genIcon(        path.join(ASSETS, 'favicon.png'),                   64);

// 2. Android native mipmap WebP files (what the launcher actually reads)
await genAndroidMipmap();

console.log('\n✅  All done — install the updated APK:\n');
console.log('    npx expo run:android\n');
