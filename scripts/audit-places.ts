/**
 * Audit the places that have no editorial copy (Ralph task 3.12)
 *
 *   DATABASE_URL=postgres://... GOOGLE_PLACES_API_KEY=... npx tsx scripts/audit-places.ts
 *   npx tsx scripts/audit-places.ts --apply
 *   npx tsx scripts/audit-places.ts --limit 5 --report /tmp/audit.json
 *
 * For every row where `pitch` is NULL, calls Place Details (New) on the row's
 * google_place_id and decides, from Google's businessStatus, displayName,
 * primaryType and formattedAddress plus our own review context, one of:
 *
 *   delete   the place is closed, or nothing on Google corresponds to it
 *   rename   Google's listing at the same address now carries a different name
 *            (the business changed hands); take Google's name (and Google's
 *            street line when our stored address has a different street
 *            number) and mark the row `pending` so
 *            `enrich-places.ts --refresh --pending` re-pulls it
 *   repoint  the stored place id was a wrong match (not a food/drink/nightlife
 *            type, or outside the neighborhood); Text Search found an open
 *            place with a matching name, so store that id and mark pending
 *   keep     OPERATIONAL with a matching name; copy still has to be written
 *
 * Rule order per row (first match wins):
 *   0. explicit decisions in OVERRIDES (the user's own notes from 3.5a-d)
 *   a. businessStatus CLOSED_PERMANENTLY / CLOSED_TEMPORARILY    -> delete
 *   c. primaryType is not a food, drink or nightlife type, or the formatted
 *      address is outside zips 10002/10003/10009, or Google has no status for
 *      it -> Text Search "<row name> <row address>": top result OPERATIONAL
 *      with a matching name -> repoint, otherwise               -> delete
 *   a. no reviews in review-context.json AND no regularOpeningHours -> delete
 *   b. displayName differs materially from the row name (token overlap
 *      coefficient below 0.5 after normalising case, punctuation and dropping
 *      'the' and generic venue words) at the same street number -> rename
 *      at a different address -> treated like c (Text Search, else delete)
 *   d. OPERATIONAL with a matching name                           -> keep
 *
 * (c) runs before (b) and before the no-reviews half of (a) on purpose: when
 * Google matched a building or a hotel, renaming the row to the building's
 * name would be wrong, and the building having no reviews says nothing about
 * whether the bar is open; Text Search gets to look for it first.
 *
 * Default is a dry run that prints the decision table and writes nothing.
 * `--apply` runs the deletes, renames and repoints in one transaction, after
 * appending the full deleted rows (with their tag values) to
 * scripts/ralph/data/deleted-places.json so they can be restored.
 *
 * Flags:
 *   --apply          Write to the database (default: dry run).
 *   --limit N        Audit at most N rows (alphabetical).
 *   --report <path>  Also write the decisions as JSON to <path>.
 *
 * Required environment variables:
 *   DATABASE_URL          — PostgreSQL connection string
 *   GOOGLE_PLACES_API_KEY — Google Places API (New) key
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!apiKey) {
  console.error('Error: GOOGLE_PLACES_API_KEY environment variable is required');
  process.exit(1);
}

const argv = process.argv.slice(2);
const isApply = argv.includes('--apply');

function parseValueFlag(name: string): string | null {
  const eqArg = argv.find((a) => a.startsWith(`${name}=`));
  const idx = argv.indexOf(name);
  if (eqArg === undefined && idx === -1) return null;
  const raw = eqArg ? eqArg.slice(name.length + 1) : argv[idx + 1];
  if (raw === undefined || raw.startsWith('--')) {
    console.error(`Error: ${name} expects a value`);
    process.exit(1);
  }
  return raw;
}

function parseLimit(): number | null {
  const raw = parseValueFlag('--limit');
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`Error: --limit expects a positive integer, got "${raw}"`);
    process.exit(1);
  }
  return n;
}

const limit = parseLimit();
const reportPath = parseValueFlag('--report');

// Relative to the working directory: run from the repo root.
const REVIEW_CONTEXT_PATH = resolve(process.cwd(), 'scripts/ralph/data/review-context.json');
const DELETED_PATH = resolve(process.cwd(), 'scripts/ralph/data/deleted-places.json');

const DETAILS_FIELD_MASK =
  'id,displayName,businessStatus,primaryType,formattedAddress,regularOpeningHours';
const SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.businessStatus,places.primaryType,places.formattedAddress';

const EAST_VILLAGE_ZIPS = new Set(['10002', '10003', '10009']);
const NAME_MATCH_THRESHOLD = 0.5;

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Full places row plus its tag values; this is what deleted-places.json stores. */
interface PlaceRow {
  id: string;
  name: string;
  address: string | null;
  google_place_id: string | null;
  enrichment_status: string | null;
  tags: string[];
  [column: string]: unknown;
}

type Decision = 'delete' | 'rename' | 'repoint' | 'keep';

interface TagChange {
  add?: string[];
  remove?: string[];
}

interface Override {
  decision: Decision;
  newName?: string;
  tags?: TagChange;
  reason: string;
}

interface GooglePlace {
  id: string | null;
  displayName: string | null;
  businessStatus: string | null;
  primaryType: string | null;
  formattedAddress: string | null;
  hasHours: boolean;
}

interface AuditResult {
  id: string;
  name: string;
  address: string | null;
  decision: Decision;
  rule: string;
  reason: string;
  google: GooglePlace | null;
  newName?: string;
  /** Google's street line when a renamed row's stored address has a different street number. */
  newAddress?: string;
  newGooglePlaceId?: string;
  tags?: TagChange;
}

interface ReviewContextEntry {
  id: string;
  google?: { reviews?: unknown[] };
}

// ---------------------------------------------------------------------------
// Explicit decisions from the user's notes (3.5a-d). Keyed by the row name as
// stored in prod (trimmed, case-insensitive) plus the address where two rows
// share a name.
// ---------------------------------------------------------------------------

const OVERRIDES: Array<{ name: string; address?: string; override: Override }> = [
  {
    name: "Luzzo's Group",
    override: { decision: 'rename', newName: 'Olio e Più', reason: 'user note: the 211 1st Ave pizzeria is now Olio e Più' },
  },
  {
    name: 'Pinks',
    override: {
      decision: 'rename',
      newName: 'Apollo Bagels',
      tags: { add: ['food'], remove: ['Late-Night-Food'] },
      reason: 'user note: 242 E 10th St is now Apollo Bagels; retag food, not Late-Night-Food',
    },
  },
  {
    name: 'V-Bar',
    override: { decision: 'rename', newName: "Lion's", reason: 'user note: 132 1st Ave is now Lion\'s' },
  },
  {
    name: 'White Noise',
    override: { decision: 'rename', newName: 'Eleven Tigers', reason: 'user note: 225 Ave B is now Eleven Tigers' },
  },
  {
    name: 'The Eddy',
    override: { decision: 'rename', newName: 'Raku', reason: 'user note: 342 E 6th St is now Raku' },
  },
  {
    name: 'Matilda',
    override: { decision: 'rename', newName: 'Fiaschetteria Pistoia', reason: 'user note: 647 E 11th St is now Fiaschetteria Pistoia' },
  },
  {
    name: 'Ngam',
    override: { decision: 'rename', newName: 'Bánh Anh Em', reason: 'user note: 99 3rd Ave is now Bánh Anh Em' },
  },
  {
    name: 'Terroir',
    override: { decision: 'delete', reason: 'user note: closed years ago' },
  },
  {
    name: 'Nublu',
    address: '62 Avenue C',
    override: { decision: 'delete', reason: 'user note: stale duplicate of the 151 Ave C row "Nublu (New One)"' },
  },
  {
    name: 'Momofuku Milk Bar',
    override: { decision: 'delete', reason: 'user note: duplicate of "Milk Bar East Village" (same address); stored place id is Momofuku Noodle Bar' },
  },
];

function findOverride(row: PlaceRow): Override | null {
  const name = row.name.trim().toLowerCase();
  const address = (row.address ?? '').trim().toLowerCase();
  for (const entry of OVERRIDES) {
    if (entry.name.toLowerCase() !== name) continue;
    if (entry.address !== undefined && entry.address.toLowerCase() !== address) continue;
    return entry.override;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Food / drink / nightlife types (Places API (New) Table A values). Anything
// else, or an unknown type, is treated as a wrong match and goes to Text Search.
// ---------------------------------------------------------------------------

const FOOD_DRINK_NIGHTLIFE_TYPES = new Set([
  'restaurant',
  'bar',
  'bar_and_grill',
  'pub',
  'wine_bar',
  'cocktail_bar',
  'night_club',
  'karaoke',
  'comedy_club',
  'live_music_venue',
  'dance_hall',
  'cafe',
  'coffee_shop',
  'cafeteria',
  'tea_house',
  'bakery',
  'bagel_shop',
  'deli',
  'diner',
  'dessert_shop',
  'dessert_restaurant',
  'ice_cream_shop',
  'juice_shop',
  'candy_store',
  'chocolate_shop',
  'donut_shop',
  'sandwich_shop',
  'food_court',
  'meal_takeaway',
  'meal_delivery',
  'steak_house',
  'liquor_store',
  'food',
]);

function isFoodDrinkNightlife(primaryType: string | null): boolean {
  if (!primaryType) return false;
  if (FOOD_DRINK_NIGHTLIFE_TYPES.has(primaryType)) return true;
  return primaryType.endsWith('_restaurant') || primaryType.endsWith('_bar');
}

// ---------------------------------------------------------------------------
// Name and address matching
// ---------------------------------------------------------------------------

/**
 * Words that say nothing about which business this is. "Klimat Lounge" and
 * "B Lounge NYC" share "lounge" but are not the same place.
 */
const STOP_TOKENS = new Set(['the', 'and', 'nyc', 'bar', 'lounge', 'restaurant', 'cafe']);

/** Lowercase, strip diacritics and punctuation, drop stop words; returns a token set. */
function nameTokens(name: string): Set<string> {
  const normalized = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const all = new Set<string>();
  const kept = new Set<string>();
  for (const token of normalized.split(' ')) {
    if (!token) continue;
    all.add(token);
    if (!STOP_TOKENS.has(token)) kept.add(token);
  }
  // A name made only of stop words ("The Bar") keeps them; there is nothing else to compare.
  return kept.size > 0 ? kept : all;
}

/**
 * Overlap coefficient: |A ∩ B| / min(|A|, |B|). 1 when one name is a subset of
 * the other ("Kobo by Nai" vs "Kobo by Nai Mediterranean Restaurant and Bar"),
 * 0 when they share nothing ("V-Bar" vs "Lion's").
 */
function nameOverlap(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const token of ta) if (tb.has(token)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

function namesMatch(a: string, b: string | null): boolean {
  if (!b) return false;
  return nameOverlap(a, b) >= NAME_MATCH_THRESHOLD;
}

/** Leading street number of an address string ("242 East 10th street" -> "242"). */
function streetNumber(address: string | null): string | null {
  if (!address) return null;
  const match = address.trim().match(/^(\d+[A-Za-z]?)\b/);
  return match ? match[1] : null;
}

function sameStreetNumber(ours: string | null, google: string | null): boolean {
  const a = streetNumber(ours);
  const b = streetNumber(google);
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}

/** Street line of a Google formatted address ("106 3rd Ave, New York, NY 10003, USA" -> "106 3rd Ave"). */
function streetLine(formattedAddress: string | null): string | null {
  if (!formattedAddress) return null;
  const line = formattedAddress.split(',')[0].trim();
  return line.length > 0 ? line : null;
}

/**
 * For a rename: Google's street line when our stored address has a different street
 * number (the listing moved, or the old address was stale), otherwise undefined.
 */
function renamedAddress(row: PlaceRow, google: GooglePlace | null): string | undefined {
  const line = streetLine(google?.formattedAddress ?? null);
  if (!line || streetNumber(line) === null) return undefined;
  return sameStreetNumber(row.address, line) ? undefined : line;
}

/** Five-digit zip in a formatted address, or null. */
function zipOf(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

function inNeighborhoodZip(address: string | null): boolean {
  const zip = zipOf(address);
  return zip !== null && EAST_VILLAGE_ZIPS.has(zip);
}

// ---------------------------------------------------------------------------
// Review context
// ---------------------------------------------------------------------------

function loadReviewCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  if (!existsSync(REVIEW_CONTEXT_PATH)) {
    console.error(`Warning: ${REVIEW_CONTEXT_PATH} not found; every row is treated as having no reviews`);
    return counts;
  }
  const parsed = JSON.parse(readFileSync(REVIEW_CONTEXT_PATH, 'utf8')) as Record<string, ReviewContextEntry>;
  for (const [id, entry] of Object.entries(parsed)) {
    counts.set(id, Array.isArray(entry.google?.reviews) ? entry.google.reviews.length : 0);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Google Places API helpers (same fetch shape as scripts/enrich-places.ts)
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  businessStatus?: string;
  primaryType?: string;
  formattedAddress?: string;
  regularOpeningHours?: { periods?: unknown[]; weekdayDescriptions?: unknown[] };
}

function mapPlace(raw: RawPlace): GooglePlace {
  const hours = raw.regularOpeningHours;
  const hasHours =
    (Array.isArray(hours?.periods) && hours.periods.length > 0) ||
    (Array.isArray(hours?.weekdayDescriptions) && hours.weekdayDescriptions.length > 0);
  return {
    id: raw.id ?? null,
    displayName: raw.displayName?.text?.trim() || null,
    businessStatus: raw.businessStatus ?? null,
    primaryType: raw.primaryType ?? null,
    formattedAddress: raw.formattedAddress ?? null,
    hasHours,
  };
}

/** Place Details (New). Returns null on HTTP 404 (dead id) and other failures. */
async function fetchDetails(googlePlaceId: string, label: string): Promise<GooglePlace | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const resourceName = googlePlaceId.startsWith('places/') ? googlePlaceId : `places/${googlePlaceId}`;
    const response = await fetch(`https://places.googleapis.com/v1/${resourceName}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'X-Goog-Api-Key': apiKey as string, 'X-Goog-FieldMask': DETAILS_FIELD_MASK },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(
        `  Place Details HTTP ${response.status} for "${label}" (${googlePlaceId})` +
          (body ? `: ${body.slice(0, 200)}` : '')
      );
      return null;
    }
    return mapPlace((await response.json()) as RawPlace);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`  Place Details timeout for "${label}"`);
    } else {
      console.error(`  Place Details error for "${label}":`, err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Text Search (New) for "<name> <address>", biased to the East Village. Top result or null. */
async function searchTop(name: string, address: string | null): Promise<GooglePlace | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const textQuery = [name.trim(), (address ?? '').trim(), 'New York, NY'].filter(Boolean).join(' ');
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey as string,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        locationBias: {
          circle: { center: { latitude: 40.7264, longitude: -73.9818 }, radius: 1000.0 },
        },
      }),
    });
    if (!response.ok) {
      console.error(`  Text Search HTTP ${response.status} for "${name}"`);
      return null;
    }
    const data = (await response.json()) as { places?: RawPlace[] };
    const top = data.places?.[0];
    return top ? mapPlace(top) : null;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`  Text Search timeout for "${name}"`);
    } else {
      console.error(`  Text Search error for "${name}":`, err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

async function classify(
  row: PlaceRow,
  reviewCount: number,
  usedPlaceIds: Set<string>
): Promise<AuditResult> {
  const base = { id: row.id, name: row.name, address: row.address };

  const override = findOverride(row);
  const google = row.google_place_id ? await fetchDetails(row.google_place_id, row.name) : null;
  if (row.google_place_id) await sleep(100);

  if (override) {
    return {
      ...base,
      google,
      decision: override.decision,
      rule: 'override',
      reason: override.reason,
      newName: override.newName,
      newAddress: override.decision === 'rename' ? renamedAddress(row, google) : undefined,
      tags: override.tags,
    };
  }

  // (a) closed on Google.
  if (google?.businessStatus === 'CLOSED_PERMANENTLY' || google?.businessStatus === 'CLOSED_TEMPORARILY') {
    return { ...base, google, decision: 'delete', rule: 'a', reason: `Google businessStatus ${google.businessStatus}` };
  }

  // (c) wrong kind of place, outside the neighborhood, or a dead/unknown listing: try Text Search.
  // This runs before the no-reviews half of (a): a match on a bare building has no reviews
  // because it is the wrong match, not because the business is gone.
  const nameOk = google ? namesMatch(row.name, google.displayName) : false;
  const addressOk = google ? sameStreetNumber(row.address, google.formattedAddress) : false;
  const thin = reviewCount === 0 && !(google?.hasHours ?? false);
  let searchWhy: string | null = null;
  if (!google) searchWhy = 'the stored Google place id did not resolve';
  else if (!isFoodDrinkNightlife(google.primaryType)) searchWhy = `Google type "${google.primaryType ?? 'none'}" is not food, drink or nightlife`;
  else if (!inNeighborhoodZip(google.formattedAddress)) searchWhy = `Google address "${google.formattedAddress ?? '?'}" is outside zips 10002/10003/10009`;
  else if (google.businessStatus !== 'OPERATIONAL') searchWhy = `Google businessStatus is ${google.businessStatus ?? 'missing'}`;
  else if (!nameOk && !addressOk) searchWhy = `Google matched "${google.displayName ?? '?'}" at "${google.formattedAddress ?? '?'}", a different name at a different address`;
  if (searchWhy && thin) searchWhy += ' (and the row has no reviews in review-context and no opening hours)';

  // (a) nothing to ground copy in: a real food/drink listing with no reviews and no hours.
  if (!searchWhy && thin) {
    return {
      ...base,
      google,
      decision: 'delete',
      rule: 'a',
      reason: `no reviews in review-context and no opening hours on Google (matched "${google?.displayName ?? '?'}", ${google?.primaryType ?? 'no type'})`,
    };
  }

  if (searchWhy) {
    const top = await searchTop(row.name, row.address);
    await sleep(100);
    const matchText = top
      ? `top Text Search result "${top.displayName ?? '?'}" (${top.businessStatus ?? 'no status'}, ${top.primaryType ?? 'no type'}, ${top.formattedAddress ?? '?'})`
      : 'Text Search returned nothing';
    if (top && top.id && top.businessStatus === 'OPERATIONAL' && namesMatch(row.name, top.displayName)) {
      if (top.id === row.google_place_id) {
        // Search confirms the stored id; it is a real open place under this name after all.
        return { ...base, google, decision: 'keep', rule: 'c', reason: `${searchWhy}; ${matchText} is the stored place id, so it stands` };
      }
      if (usedPlaceIds.has(top.id)) {
        return { ...base, google, decision: 'delete', rule: 'c', reason: `${searchWhy}; ${matchText} is already another row's place id (duplicate)` };
      }
      return { ...base, google, decision: 'repoint', rule: 'c', reason: `${searchWhy}; ${matchText}`, newGooglePlaceId: top.id };
    }
    const why = !top
      ? ''
      : top.businessStatus !== 'OPERATIONAL'
        ? ', which is not operational'
        : ', whose name does not match';
    return { ...base, google, decision: 'delete', rule: 'c', reason: `${searchWhy}; ${matchText}${why}` };
  }

  // From here google is non-null, a food/drink/nightlife type, in the neighborhood and OPERATIONAL.
  const g = google as GooglePlace;

  // (b) same address, different name: the business changed hands.
  if (!nameOk && g.displayName) {
    return {
      ...base,
      google: g,
      decision: 'rename',
      rule: 'b',
      reason: `Google lists "${g.displayName}" (${g.primaryType ?? 'no type'}) at the same address; name overlap ${nameOverlap(row.name, g.displayName).toFixed(2)}`,
      newName: g.displayName,
      newAddress: renamedAddress(row, g),
    };
  }

  // (d) open, right name.
  return {
    ...base,
    google: g,
    decision: 'keep',
    rule: 'd',
    reason: `OPERATIONAL as "${g.displayName ?? row.name}" (${g.primaryType ?? 'no type'})${g.hasHours ? '' : ', no opening hours on Google'}`,
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

function appendDeleted(rows: PlaceRow[], results: AuditResult[]): void {
  const existing: Array<Record<string, unknown>> = existsSync(DELETED_PATH)
    ? (JSON.parse(readFileSync(DELETED_PATH, 'utf8')) as Array<Record<string, unknown>>)
    : [];
  const already = new Set(existing.map((e) => e.id));
  const reasonById = new Map(results.map((r) => [r.id, r.reason]));
  const now = new Date().toISOString();
  for (const row of rows) {
    if (already.has(row.id)) continue;
    existing.push({ ...row, deleted_at: now, deleted_reason: reasonById.get(row.id) ?? null });
  }
  mkdirSync(dirname(DELETED_PATH), { recursive: true });
  writeFileSync(DELETED_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf8');
}

async function applyTagChange(client: PoolClient, placeId: string, change: TagChange): Promise<void> {
  for (const value of change.remove ?? []) {
    await client.query(
      `DELETE FROM place_tags WHERE place_id = $1 AND tag_id IN (SELECT id FROM tags WHERE value = $2)`,
      [placeId, value]
    );
  }
  for (const value of change.add ?? []) {
    const tag = await client.query<{ id: string }>(`SELECT id FROM tags WHERE value = $1`, [value]);
    if (tag.rowCount !== 1) throw new Error(`tag "${value}" not found`);
    await client.query(
      `INSERT INTO place_tags (place_id, tag_id, sort_order)
       SELECT $1, $2, COALESCE(MAX(sort_order), -1) + 1 FROM place_tags WHERE place_id = $1
       ON CONFLICT DO NOTHING`,
      [placeId, tag.rows[0].id]
    );
  }
}

async function apply(results: AuditResult[], rowsById: Map<string, PlaceRow>): Promise<void> {
  const deletes = results.filter((r) => r.decision === 'delete');
  const renames = results.filter((r) => r.decision === 'rename');
  const repoints = results.filter((r) => r.decision === 'repoint');

  if (deletes.length > 0) {
    appendDeleted(
      deletes.map((r) => rowsById.get(r.id)).filter((r): r is PlaceRow => r !== undefined),
      deletes
    );
    console.log(`Backed up ${deletes.length} row(s) to ${DELETED_PATH}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of renames) {
      const res = await client.query(
        `UPDATE places
            SET name = $2,
                address = COALESCE($3, address),
                enrichment_status = 'pending',
                updated_at = NOW()
          WHERE id = $1`,
        [r.id, r.newName, r.newAddress ?? null]
      );
      if (res.rowCount !== 1) throw new Error(`rename ${r.id}: updated ${res.rowCount} rows`);
      if (r.tags) await applyTagChange(client, r.id, r.tags);
    }
    for (const r of repoints) {
      const res = await client.query(
        `UPDATE places SET google_place_id = $2, enrichment_status = 'pending', updated_at = NOW() WHERE id = $1`,
        [r.id, r.newGooglePlaceId]
      );
      if (res.rowCount !== 1) throw new Error(`repoint ${r.id}: updated ${res.rowCount} rows`);
    }
    if (deletes.length > 0) {
      const res = await client.query(`DELETE FROM places WHERE id = ANY($1::uuid[])`, [deletes.map((r) => r.id)]);
      if (res.rowCount !== deletes.length) throw new Error(`delete: expected ${deletes.length} rows, deleted ${res.rowCount}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(`Applied: ${deletes.length} deleted, ${renames.length} renamed, ${repoints.length} repointed (all set pending)`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const reviewCounts = loadReviewCounts();

  const result = await pool.query<PlaceRow>(
    `SELECT
       p.*,
       COALESCE(
         array_agg(t.value ORDER BY pt.sort_order, t.sort_order) FILTER (WHERE t.value IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS tags
     FROM places p
     LEFT JOIN place_tags pt ON p.id = pt.place_id
     LEFT JOIN tags t ON pt.tag_id = t.id
     WHERE p.pitch IS NULL OR btrim(p.pitch) = ''
     GROUP BY p.id
     ORDER BY p.name
     ${limit !== null ? `LIMIT ${limit}` : ''}`
  );
  const rows = result.rows;
  const rowsById = new Map(rows.map((r) => [r.id, r]));

  const used = await pool.query<{ google_place_id: string }>(
    `SELECT google_place_id FROM places WHERE google_place_id IS NOT NULL`
  );
  const usedPlaceIds = new Set(used.rows.map((r) => r.google_place_id));

  console.log(
    `Auditing ${rows.length} place(s) with no pitch` +
      (limit !== null ? ` (limit ${limit})` : '') +
      (isApply ? ' [APPLY: writing to the database]' : ' [dry run: no writes]')
  );

  const results: AuditResult[] = [];
  for (const [i, row] of rows.entries()) {
    console.log(`[${i + 1}/${rows.length}] "${row.name}" ${row.address ?? '(no address)'}`);
    const r = await classify(row, reviewCounts.get(row.id) ?? 0, usedPlaceIds);
    results.push(r);
    console.log(
      `  -> ${r.decision.toUpperCase()} (${r.rule}): ${r.reason}` +
        (r.newName ? ` => "${r.newName}"` : '') +
        (r.newAddress ? ` @ "${r.newAddress}"` : '')
    );
  }

  // Google's name is the row's new name; a rename must not collide with a Text Search repoint
  // onto an id that another audited row also wants.
  const wanted = new Map<string, string[]>();
  for (const r of results) {
    if (r.decision === 'repoint' && r.newGooglePlaceId) {
      wanted.set(r.newGooglePlaceId, [...(wanted.get(r.newGooglePlaceId) ?? []), r.name]);
    }
  }
  for (const r of results) {
    if (r.decision === 'repoint' && r.newGooglePlaceId && (wanted.get(r.newGooglePlaceId)?.length ?? 0) > 1) {
      const names = wanted.get(r.newGooglePlaceId) as string[];
      if (names[0] !== r.name) {
        r.decision = 'delete';
        r.reason += `; same Text Search result as "${names[0]}", so this row is the duplicate`;
        delete r.newGooglePlaceId;
      }
    }
  }

  const counts: Record<Decision, number> = { delete: 0, rename: 0, repoint: 0, keep: 0 };
  for (const r of results) counts[r.decision]++;

  console.log('');
  console.log('Decisions');
  for (const decision of ['delete', 'rename', 'repoint', 'keep'] as Decision[]) {
    const group = results.filter((r) => r.decision === decision);
    console.log(`  ${decision.toUpperCase()} (${group.length})`);
    for (const r of group) {
      console.log(
        `    - ${r.name.trim()} | ${r.address ?? '(no address)'}` +
          (r.newName ? ` | -> "${r.newName}"` : '') +
          (r.newAddress ? ` | address -> "${r.newAddress}"` : '') +
          (r.newGooglePlaceId ? ` | -> ${r.newGooglePlaceId}` : '') +
          ` | ${r.reason}`
      );
    }
  }
  console.log('');
  console.log(
    `Summary: ${results.length} audited; ${counts.delete} delete, ${counts.rename} rename, ${counts.repoint} repoint, ${counts.keep} keep`
  );

  if (reportPath) {
    writeFileSync(resolve(reportPath), JSON.stringify(results, null, 2) + '\n', 'utf8');
    console.log(`Report written to ${resolve(reportPath)}`);
  }

  if (isApply) {
    await apply(results, rowsById);
  } else {
    console.log('Dry run: nothing written. Re-run with --apply to delete, rename and repoint.');
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
