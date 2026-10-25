/**
 * Pull Google review context for editorial writing (Ralph task 3.4)
 *
 *   DATABASE_URL=postgres://... GOOGLE_PLACES_API_KEY=... npx tsx scripts/pull-review-context.ts
 *   npx tsx scripts/pull-review-context.ts --limit 5
 *   npx tsx scripts/pull-review-context.ts --force
 *
 * For every place with a google_place_id, calls Place Details (New) with the
 * field mask rating,userRatingCount,reviews,editorialSummary,generativeSummary,
 * primaryTypeDisplayName and writes scripts/ralph/data/review-context.json,
 * keyed by place id, combining our own row (name, address, cross street, tags,
 * weekday hours lines, price tier) with Google's rating, summaries and up to 5
 * reviews.
 *
 * The output file holds Google content. It is gitignored, is working material
 * for writing our own copy, and nothing in it is ever written to the database.
 * This script only reads from Postgres.
 *
 * Details with reviews bill on the Enterprise + Atmosphere SKU, so the script
 * resumes: ids already in the file are skipped unless --force is given, and the
 * file is rewritten every 20 places and at the end.
 *
 * Flags:
 *   --limit N   Process at most N places (after skipping ones already in the file).
 *   --force     Re-fetch places that already have an entry.
 *
 * Required environment variables:
 *   DATABASE_URL          — PostgreSQL connection string
 *   GOOGLE_PLACES_API_KEY — Google Places API (New) key
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Pool } from 'pg';

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

const isForce = process.argv.includes('--force');

/**
 * Parse `--limit N` (or `--limit=N`). Returns null when absent.
 * Exits with an error on a non-positive or non-numeric value.
 */
function parseLimit(argv: string[]): number | null {
  const eqArg = argv.find((a) => a.startsWith('--limit='));
  const idx = argv.indexOf('--limit');
  const raw = eqArg ? eqArg.slice('--limit='.length) : idx !== -1 ? argv[idx + 1] : undefined;
  if (eqArg === undefined && idx === -1) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`Error: --limit expects a positive integer, got "${raw ?? ''}"`);
    process.exit(1);
  }
  return n;
}

const limit = parseLimit(process.argv.slice(2));

// Relative to the working directory: run from the repo root.
const OUTPUT_PATH = resolve(process.cwd(), 'scripts/ralph/data/review-context.json');
const FLUSH_EVERY = 20;
const MAX_REVIEWS = 5;
const FIELD_MASK =
  'rating,userRatingCount,reviews,editorialSummary,generativeSummary,primaryTypeDisplayName';

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

interface PlaceRow {
  id: string;
  name: string;
  address: string | null;
  cross_street: string | null;
  price_tier: string | null;
  hours_json: { weekdayDescriptions?: unknown } | null;
  google_place_id: string;
  tags: string[];
}

interface ReviewEntry {
  text: string;
  rating: number | null;
  publishTime: string | null;
  relativePublishTimeDescription: string | null;
}

interface GoogleContext {
  rating: number | null;
  user_rating_count: number | null;
  editorial_summary: string | null;
  generative_summary: string | null;
  primary_type: string | null;
  reviews: ReviewEntry[];
}

interface ReviewContextEntry {
  id: string;
  name: string;
  address: string | null;
  cross_street: string | null;
  tags: string[];
  hours: string[] | null;
  price_tier: string | null;
  google_place_id: string;
  fetched_at: string;
  google: GoogleContext;
}

type ReviewContextFile = Record<string, ReviewContextEntry>;

/** Shape of the Place Details (New) response for our field mask. */
interface PlaceDetailsResponse {
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
  generativeSummary?: { overview?: { text?: string }; description?: { text?: string } };
  reviews?: Array<{
    rating?: number;
    publishTime?: string;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
  }>;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadExisting(): ReviewContextFile {
  if (!existsSync(OUTPUT_PATH)) return {};
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8')) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ReviewContextFile;
    }
    console.error(`Warning: ${OUTPUT_PATH} is not a JSON object; starting fresh`);
    return {};
  } catch (err) {
    console.error(`Warning: could not parse ${OUTPUT_PATH}; starting fresh`, err);
    return {};
  }
}

function writeFile(data: ReviewContextFile): void {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  // Sort keys by place name so diffs between runs are readable.
  const sorted: ReviewContextFile = {};
  for (const key of Object.keys(data).sort((a, b) => data[a].name.localeCompare(data[b].name))) {
    sorted[key] = data[key];
  }
  writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function weekdayLines(hoursJson: PlaceRow['hours_json']): string[] | null {
  const lines = hoursJson?.weekdayDescriptions;
  if (!Array.isArray(lines)) return null;
  const strings = lines.filter((l): l is string => typeof l === 'string');
  return strings.length > 0 ? strings : null;
}

// ---------------------------------------------------------------------------
// Google Places API helper (same shape as scripts/enrich-places.ts)
// ---------------------------------------------------------------------------

/**
 * Fetch rating, review count, summaries and reviews for a Google place id.
 * Returns the mapped context or null on failure.
 */
async function fetchReviewContext(
  googlePlaceId: string,
  placeName: string
): Promise<GoogleContext | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const resourceName = googlePlaceId.startsWith('places/')
      ? googlePlaceId
      : `places/${googlePlaceId}`;

    const response = await fetch(`https://places.googleapis.com/v1/${resourceName}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'X-Goog-Api-Key': apiKey as string,
        'X-Goog-FieldMask': FIELD_MASK,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(
        `  Place Details HTTP ${response.status} for "${placeName}" (${googlePlaceId})` +
          (body ? `: ${body.slice(0, 300)}` : '')
      );
      return null;
    }

    const data = (await response.json()) as PlaceDetailsResponse;

    const reviews: ReviewEntry[] = (data.reviews ?? [])
      .map((r) => ({
        text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
        rating: typeof r.rating === 'number' ? r.rating : null,
        publishTime: r.publishTime ?? null,
        relativePublishTimeDescription: r.relativePublishTimeDescription ?? null,
      }))
      .filter((r) => r.text.length > 0)
      // Newest first, so the writer weights recent reviews most.
      .sort((a, b) => (b.publishTime ?? '').localeCompare(a.publishTime ?? ''))
      .slice(0, MAX_REVIEWS);

    return {
      rating: typeof data.rating === 'number' ? data.rating : null,
      user_rating_count: typeof data.userRatingCount === 'number' ? data.userRatingCount : null,
      editorial_summary: data.editorialSummary?.text ?? null,
      generative_summary:
        data.generativeSummary?.overview?.text ?? data.generativeSummary?.description?.text ?? null,
      primary_type: data.primaryTypeDisplayName?.text ?? null,
      reviews,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`  Place Details timeout for "${placeName}"`);
    } else {
      console.error(`  Place Details error for "${placeName}":`, err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const result = await pool.query<PlaceRow>(
    `SELECT
       p.id, p.name, p.address, p.cross_street, p.price_tier, p.hours_json, p.google_place_id,
       COALESCE(
         array_agg(t.value ORDER BY pt.sort_order, t.sort_order) FILTER (WHERE t.value IS NOT NULL),
         ARRAY[]::varchar[]
       ) AS tags
     FROM places p
     LEFT JOIN place_tags pt ON p.id = pt.place_id
     LEFT JOIN tags t ON pt.tag_id = t.id
     WHERE p.google_place_id IS NOT NULL
     GROUP BY p.id
     ORDER BY p.name`
  );

  const existing = loadExisting();
  const all = result.rows;
  const pending = isForce ? all : all.filter((p) => !(p.id in existing));
  const todo = limit !== null ? pending.slice(0, limit) : pending;

  console.log(
    `Found ${all.length} place(s) with a google_place_id; ` +
      `${Object.keys(existing).length} already in ${OUTPUT_PATH}; ` +
      `${pending.length} to fetch` +
      (limit !== null ? ` (limit ${limit})` : '') +
      (isForce ? ' [--force: re-fetching existing entries]' : '')
  );

  let ok = 0;
  let failed = 0;
  const failures: string[] = [];
  const output: ReviewContextFile = { ...existing };

  for (const [i, place] of todo.entries()) {
    console.log(`[${i + 1}/${todo.length}] "${place.name}"`);

    const google = await fetchReviewContext(place.google_place_id, place.name);
    await sleep(100);

    if (!google) {
      failed++;
      failures.push(place.name);
      continue;
    }

    output[place.id] = {
      id: place.id,
      name: place.name,
      address: place.address,
      cross_street: place.cross_street,
      tags: place.tags,
      hours: weekdayLines(place.hours_json),
      price_tier: place.price_tier,
      google_place_id: place.google_place_id,
      fetched_at: new Date().toISOString(),
      google,
    };
    ok++;
    console.log(
      `  OK: rating ${google.rating ?? '-'} (${google.user_rating_count ?? 0}), ` +
        `${google.reviews.length} review(s)` +
        (google.editorial_summary ? ', editorial' : '') +
        (google.generative_summary ? ', generative' : '')
    );

    if ((ok + failed) % FLUSH_EVERY === 0) {
      writeFile(output);
    }
  }

  writeFile(output);

  console.log(
    `Review context: ${todo.length} processed, ${ok} ok, ${failed} failed; ` +
      `${Object.keys(output).length} of ${all.length} place(s) in ${OUTPUT_PATH}`
  );
  if (failures.length > 0) {
    console.log('Failed:');
    for (const name of failures) console.log(`  - ${name}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
