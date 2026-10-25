#!/usr/bin/env node
// Generates the fastlane deliver inputs for the iOS App Store listing:
//   apps/mobile/fastlane/metadata/      from docs/app-store/listing.md
//   apps/mobile/fastlane/screenshots/   from docs/app-store/screenshots/<size>/*.png
// listing.md is the source of truth; edit it, rerun this, then run fastlane deliver
// (see apps/mobile/fastlane/Deliverfile). Usage: node scripts/app-store-metadata.mjs
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const listingPath = join(root, 'docs/app-store/listing.md');
const shotsSrc = join(root, 'docs/app-store/screenshots');
const fastlaneDir = join(root, 'apps/mobile/fastlane');
const metaDir = join(fastlaneDir, 'metadata');
const localeDir = join(metaDir, 'en-US');
const reviewDir = join(metaDir, 'review_information');
const shotsDir = join(fastlaneDir, 'screenshots/en-US');

const md = readFileSync(listingPath, 'utf8');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Body of the first `## <heading>...` section (heading match is a prefix). */
function section(heading) {
  const re = new RegExp(`^## ${escapeRe(heading)}[^\\n]*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm');
  const m = md.match(re);
  if (!m) throw new Error(`listing.md: missing section "## ${heading}"`);
  return m[1];
}

/** Contents of the first fenced code block under a section. */
function fenced(heading) {
  const m = section(heading).match(/^```\n([\s\S]*?)\n```/m);
  if (!m) throw new Error(`listing.md: no fenced block under "## ${heading}"`);
  return m[1];
}

/** Backticked value from a `| Field | \`value\` |` table row under a section. */
function tableValue(heading, field) {
  const re = new RegExp(`^\\| ${escapeRe(field)} \\| \`([^\`]+)\` \\|`, 'm');
  const m = section(heading).match(re);
  if (!m) throw new Error(`listing.md: no table row "${field}" under "## ${heading}"`);
  return m[1];
}

/** Value of a `- Label: value` bullet under a section. */
function bullet(heading, label) {
  const re = new RegExp(`^- ${escapeRe(label)}: (.+)$`, 'm');
  const m = section(heading).match(re);
  if (!m) throw new Error(`listing.md: no bullet "${label}" under "## ${heading}"`);
  return m[1].trim();
}

// App Store Connect category codes (spaceship app_category.rb). Add as needed.
const CATEGORY_CODES = {
  'Food & Drink': 'FOOD_AND_DRINK',
  Travel: 'TRAVEL',
  Lifestyle: 'LIFESTYLE',
};
function categoryCode(name) {
  const code = CATEGORY_CODES[name];
  if (!code) throw new Error(`listing.md: unknown category "${name}"; add it to CATEGORY_CODES`);
  return code;
}

// App Store Connect character limits.
const LIMITS = { name: 30, subtitle: 30, promotional_text: 170, description: 4000, keywords: 100, release_notes: 4000 };

const locale = {
  name: fenced('Name'),
  subtitle: fenced('Subtitle'),
  promotional_text: fenced('Promotional text'),
  description: fenced('Description'),
  keywords: fenced('Keywords'),
  release_notes: fenced("What's New"),
  privacy_url: tableValue('URLs', 'Privacy Policy URL'),
  support_url: tableValue('URLs', 'Support URL'),
  marketing_url: tableValue('URLs', 'Marketing URL'),
};
const nonLocalised = {
  copyright: tableValue('URLs', 'Copyright'),
  primary_category: categoryCode(bullet('Category', 'Primary')),
  secondary_category: categoryCode(bullet('Category', 'Secondary')),
};
// App Store Connect refuses to create the review contact without a phone number
// (+country code). listing.md carries no phone, so review information is only
// generated when a `| Phone | \`+...\` |` row exists under "## Review notes";
// until then the notes and contact are entered by hand (task 5.8).
const reviewBody = section('Review notes');
const phone = reviewBody.match(/^\| Phone \| `(\+[^`]+)` \|/m)?.[1];
const review = phone
  ? {
      notes: fenced('Review notes'),
      first_name: tableValue('Review notes', 'First name'),
      last_name: tableValue('Review notes', 'Last name'),
      email_address: tableValue('Review notes', 'Email'),
      phone_number: phone,
    }
  : null;

const problems = [];
for (const [key, limit] of Object.entries(LIMITS)) {
  if (locale[key].length > limit) problems.push(`${key}: ${locale[key].length} chars, limit ${limit}`);
}
if (/,\s/.test(locale.keywords) || /\n/.test(locale.keywords)) problems.push('keywords: must be comma separated with no spaces or newlines after commas');
for (const key of ['name', 'subtitle', 'keywords', 'privacy_url', 'support_url', 'marketing_url']) {
  if (/\n/.test(locale[key])) problems.push(`${key}: must be a single line`);
}
if (problems.length) {
  console.error('listing.md fails App Store Connect limits:\n  ' + problems.join('\n  '));
  process.exit(1);
}

rmSync(metaDir, { recursive: true, force: true });
rmSync(shotsDir, { recursive: true, force: true });
mkdirSync(localeDir, { recursive: true });
mkdirSync(shotsDir, { recursive: true });

for (const [key, value] of Object.entries(locale)) writeFileSync(join(localeDir, `${key}.txt`), value + '\n');
for (const [key, value] of Object.entries(nonLocalised)) writeFileSync(join(metaDir, `${key}.txt`), value + '\n');
if (review) {
  mkdirSync(reviewDir, { recursive: true });
  for (const [key, value] of Object.entries(review)) writeFileSync(join(reviewDir, `${key}.txt`), value + '\n');
}

// Screenshots: docs/app-store/screenshots/<size>/<nn>-<name>.png -> screenshots/en-US/<size>-<nn>-<name>.png.
// deliver picks the device slot from the pixel size and orders by filename within a slot.
let shotCount = 0;
for (const size of readdirSync(shotsSrc, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  for (const file of readdirSync(join(shotsSrc, size)).filter((f) => f.endsWith('.png')).sort()) {
    copyFileSync(join(shotsSrc, size, file), join(shotsDir, `${size}-${file}`));
    shotCount++;
  }
}

console.log(`wrote ${Object.keys(locale).length} en-US files, ${Object.keys(nonLocalised).length} app-level files to ${metaDir}`);
if (review) console.log(`  review information: ${Object.keys(review).length} files`);
else console.log('  review information: skipped (no Phone row in listing.md; enter notes and contact by hand)');
for (const [key, limit] of Object.entries(LIMITS)) console.log(`  ${key}: ${locale[key].length}/${limit}`);
console.log(`  categories: ${nonLocalised.primary_category}, ${nonLocalised.secondary_category}`);
console.log(`copied ${shotCount} screenshots to ${shotsDir}`);
