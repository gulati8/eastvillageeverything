#!/usr/bin/env node
// Generates the Android launcher and splash artwork for apps/mobile from assets/icon.png:
//   assets/adaptive-icon.png  the icon artwork scaled to 684 px (the inner 66% safe zone of
//                             the 1024 adaptive-icon canvas) centred on a transparent canvas,
//                             so the launcher's mask never clips it
//   assets/splash-icon.png    the same artwork filling a transparent 1024 canvas; the
//                             expo-splash-screen plugin shows it at imageWidth 200 (Android 12+
//                             draws the splash image as a small centred icon, so the old
//                             full-screen splash.png would shrink to a speck)
// "Artwork" is icon.png with its flat canvas border trimmed off. The script also prints the
// two colours app.json pins: the icon canvas colour (android.adaptiveIcon.backgroundColor,
// so the masked circle shows no ring) and the corner colour of the old splash.png (the
// expo-splash-screen backgroundColor). Usage, from the repo root: node scripts/mobile-android-assets.mjs
import sharp from 'sharp';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'apps/mobile/assets');
const CANVAS = 1024;
const SAFE_ZONE = 684; // 66% of 1024

const hex = ([r, g, b]) => '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();

async function cornerColor(path) {
  const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return hex(Array.from(data.slice(0, 3)));
}

function transparentCanvas() {
  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
}

async function placeCentred(artwork, size, out) {
  const scaled = await sharp(artwork).resize(size, size, { fit: 'inside' }).png().toBuffer();
  await transparentCanvas().composite([{ input: scaled, gravity: 'centre' }]).png().toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${out}: ${meta.width}x${meta.height}, alpha ${meta.hasAlpha}`);
}

const iconPath = join(assets, 'icon.png');
const artwork = await sharp(iconPath).trim({ threshold: 10 }).png().toBuffer();
const art = await sharp(artwork).metadata();
console.log(`icon.png artwork after trim: ${art.width}x${art.height}`);

await placeCentred(artwork, SAFE_ZONE, join(assets, 'adaptive-icon.png'));
await placeCentred(artwork, CANVAS, join(assets, 'splash-icon.png'));

console.log(`android.adaptiveIcon.backgroundColor (icon.png canvas): ${await cornerColor(iconPath)}`);
console.log(`expo-splash-screen backgroundColor (splash.png corner): ${await cornerColor(join(assets, 'splash.png'))}`);
