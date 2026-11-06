#!/usr/bin/env node
// Generates the two Google Play graphics in docs/app-store/android/ (the phone screenshots
// there are captured from the emulator by hand; see docs/app-store/play-listing.md):
//   icon-512.png          512x512, no alpha, from apps/mobile/assets/icon.png
//   feature-graphic.png   1024x500: the app's dark paper, the name in Instrument Serif italic
//                         cream and the eyebrow in Schibsted Grotesk uppercase, rendered by
//                         Playwright from a small HTML page that loads the app's own font files
//                         (root node_modules/@expo-google-fonts/*, inlined as data URIs). Uses the installed Google
//                         Chrome (channel "chrome") so no Playwright browser download is needed;
//                         set PLAY_ASSETS_BROWSER=chromium to use Playwright's bundled build.
// Usage, from the repo root: node scripts/play-store-assets.mjs
import sharp from 'sharp';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/app-store/android');
const iconSrc = join(root, 'apps/mobile/assets/icon.png');
const fonts = join(root, 'node_modules/@expo-google-fonts');
// Fonts go in as data URIs: the page is set with setContent (origin about:blank), which Chrome
// does not let fetch file:// URLs.
const fontData = (rel) => `data:font/ttf;base64,${readFileSync(join(fonts, rel)).toString('base64')}`;
const serifItalic = fontData('instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf');
const grotesk = fontData('schibsted-grotesk/600SemiBold/SchibstedGrotesk_600SemiBold.ttf');

// Dark theme tokens from apps/mobile/src/theme/tokens.ts (paper, ink, ink3).
const PAPER = '#16110C';
const INK = '#F5EBDA';
const INK3 = '#8B7E69';
const W = 1024;
const H = 500;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Instrument Serif'; font-style: italic; font-weight: 400; src: url('${serifItalic}') format('truetype'); }
  @font-face { font-family: 'Schibsted Grotesk'; font-style: normal; font-weight: 600; src: url('${grotesk}') format('truetype'); }
  html, body { margin: 0; padding: 0; background: ${PAPER}; }
  body { width: ${W}px; height: ${H}px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .eyebrow { font-family: 'Schibsted Grotesk'; font-weight: 600; font-size: 24px; line-height: 32px; letter-spacing: 0.12em; text-transform: uppercase; color: ${INK3}; margin: 0 0 14px; }
  .title { font-family: 'Instrument Serif'; font-style: italic; font-weight: 400; font-size: 104px; line-height: 1; letter-spacing: -0.02em; color: ${INK}; margin: 0; white-space: nowrap; }
</style></head><body>
  <p class="eyebrow">Bars, happy hours, late nights</p>
  <h1 class="title">East Village Everything</h1>
</body></html>`;

mkdirSync(out, { recursive: true });

// Icon: Play wants a 512 px square PNG without transparency; it applies its own mask.
const iconPath = join(out, 'icon-512.png');
await sharp(iconSrc).resize(512, 512).flatten({ background: '#000000' }).removeAlpha().png().toFile(iconPath);

// Feature graphic.
const browser = await chromium.launch(process.env.PLAY_ASSETS_BROWSER === 'chromium' ? {} : { channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => ({
    serif: document.fonts.check("italic 400 104px 'Instrument Serif'"),
    grotesk: document.fonts.check("600 24px 'Schibsted Grotesk'"),
  }));
  if (!loaded.serif || !loaded.grotesk) throw new Error(`fonts did not load: ${JSON.stringify(loaded)}`);
  const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
  await sharp(png).flatten({ background: PAPER }).removeAlpha().png().toFile(join(out, 'feature-graphic.png'));
} finally {
  await browser.close();
}

for (const file of ['icon-512.png', 'feature-graphic.png']) {
  const m = await sharp(join(out, file)).metadata();
  console.log(`${file}: ${m.width}x${m.height}, alpha ${m.hasAlpha}, channels ${m.channels}`);
}
