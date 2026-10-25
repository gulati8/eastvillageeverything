/**
 * Google Places Enrichment Script
 *
 * Backfill mode (default):
 *   npx tsx scripts/enrich-places.ts
 *   Resolves google_place_id via Text Search, then fetches hours, price and
 *   coordinates (lat/lng) for places that have an address but no google_place_id yet.
 *
 * Refresh mode:
 *   npx tsx scripts/enrich-places.ts --refresh
 *   Re-fetches hours, price, coordinates and the Google photo reference for
 *   places with a google_place_id that are stale (>7 days).
 *
 * Both modes also store the first Google photo's resource name and author
 * attribution (`google_photo_name`, `google_photo_attribution`). The photo
 * bytes are never stored; the API proxies them on demand.
 *
 * Flags:
 *   --limit N   Process at most N places (useful for testing against prod).
 *   --dry-run   Call Google as usual but write nothing to the database; each
 *               place logs the row it would have written instead.
 *   --force     With --refresh: ignore the 7-day staleness window and refresh
 *               every place that has a google_place_id (for example after a
 *               new field such as the photo reference is added).
 *
 * Required environment variables:
 *   DATABASE_URL       — PostgreSQL connection string
 *   GOOGLE_PLACES_API_KEY — Google Places API (New) key
 */

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

const isRefresh = process.argv.includes('--refresh');
const isDryRun = process.argv.includes('--dry-run');
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

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackfillPlace {
  id: string;
  name: string;
  address: string;
}

interface RefreshPlace {
  id: string;
  name: string;
  google_place_id: string;
}

// ---------------------------------------------------------------------------
// Google Places price level mapping
// ---------------------------------------------------------------------------

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Google Places API helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a Google place_id for a given place name + address using Text Search.
 * Returns the bare place_id string (e.g. "ChIJ...") or null on failure.
 */
async function resolveGooglePlaceId(
  name: string,
  address: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey as string,
          'X-Goog-FieldMask': 'places.id',
        },
        body: JSON.stringify({
          textQuery: `${name}, ${address}, East Village, New York, NY`,
          locationBias: {
            circle: {
              center: { latitude: 40.7264, longitude: -73.9818 },
              radius: 1000.0,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `  Text Search HTTP ${response.status} for "${name}"`
      );
      return null;
    }

    const data = (await response.json()) as { places?: Array<{ id: string }> };

    if (!data.places || data.places.length === 0) {
      console.error(`  Text Search: no results for "${name}"`);
      return null;
    }

    return data.places[0].id;
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

interface PlaceDetails {
  regularOpeningHours: unknown;
  priceLevel: string | null;
  lat: number | null;
  lng: number | null;
  /** Photo resource name, `places/<id>/photos/<ref>`, or null when Google has none. */
  photoName: string | null;
  /** Display name of the first photo's first author, for attribution. */
  photoAttribution: string | null;
}

/**
 * Fetch regularOpeningHours, priceLevel, location and the first photo for a
 * given Google place_id. Returns the raw fields or null on failure.
 */
async function fetchPlaceDetails(
  googlePlaceId: string,
  placeName: string
): Promise<PlaceDetails | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    // Text Search returns the bare id (e.g. "ChIJ..."); the details resource
    // name is "places/<id>". Accept either form.
    const resourceName = googlePlaceId.startsWith('places/')
      ? googlePlaceId
      : `places/${googlePlaceId}`;

    const response = await fetch(
      `https://places.googleapis.com/v1/${resourceName}`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'X-Goog-Api-Key': apiKey as string,
          'X-Goog-FieldMask': 'regularOpeningHours,priceLevel,location,photos',
        },
      }
    );

    if (!response.ok) {
      console.error(
        `  Place Details HTTP ${response.status} for "${placeName}" (${googlePlaceId})`
      );
      return null;
    }

    const data = (await response.json()) as {
      regularOpeningHours?: unknown;
      priceLevel?: string;
      location?: { latitude?: number; longitude?: number };
      photos?: Array<{
        name?: string;
        authorAttributions?: Array<{ displayName?: string }>;
      }>;
    };

    const lat = data.location?.latitude;
    const lng = data.location?.longitude;
    const hasLocation = typeof lat === 'number' && typeof lng === 'number';
    if (!hasLocation) {
      console.error(`  Place Details: no location for "${placeName}" (${googlePlaceId})`);
    }

    const firstPhoto = data.photos?.[0];
    const photoName = typeof firstPhoto?.name === 'string' && firstPhoto.name.length > 0 ? firstPhoto.name : null;
    const photoAttribution = firstPhoto?.authorAttributions?.[0]?.displayName?.trim() || null;

    return {
      regularOpeningHours: data.regularOpeningHours ?? null,
      priceLevel: data.priceLevel ?? null,
      lat: hasLocation ? lat : null,
      lng: hasLocation ? lng : null,
      photoName,
      photoAttribution,
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
// Database helpers
// ---------------------------------------------------------------------------

function toNumericPrice(priceLevel: string | null): number | null {
  return priceLevel !== null ? (PRICE_LEVEL_MAP[priceLevel] ?? null) : null;
}

/** One-line description of the columns a write would set, for --dry-run output. */
function describeWrite(details: PlaceDetails): string {
  const periods = Array.isArray((details.regularOpeningHours as { periods?: unknown[] } | null)?.periods)
    ? (details.regularOpeningHours as { periods: unknown[] }).periods.length
    : 0;
  return (
    `hours_json=${details.regularOpeningHours ? `${periods} period(s)` : 'NULL'}, ` +
    `google_price_level=${toNumericPrice(details.priceLevel) ?? 'NULL'}, ` +
    `lat=${details.lat ?? 'NULL'}, lng=${details.lng ?? 'NULL'}, ` +
    `google_photo_name=${details.photoName ?? 'NULL'}, ` +
    `google_photo_attribution=${details.photoAttribution ?? 'NULL'}, ` +
    `enrichment_status=ok, enriched_at=NOW()`
  );
}

async function markEnriched(
  id: string,
  googlePlaceId: string,
  details: PlaceDetails
): Promise<void> {
  if (isDryRun) {
    console.log(`  DRY RUN: would UPDATE places SET google_place_id=${googlePlaceId}, ${describeWrite(details)} WHERE id=${id}`);
    return;
  }
  await pool.query(
    `UPDATE places
     SET google_place_id = $1,
         hours_json = $2,
         google_price_level = $3,
         lat = COALESCE($4, lat),
         lng = COALESCE($5, lng),
         google_photo_name = $6,
         google_photo_attribution = $7,
         enrichment_status = 'ok',
         enriched_at = NOW()
     WHERE id = $8`,
    [
      googlePlaceId,
      details.regularOpeningHours ? JSON.stringify(details.regularOpeningHours) : null,
      toNumericPrice(details.priceLevel),
      details.lat,
      details.lng,
      details.photoName,
      details.photoAttribution,
      id,
    ]
  );
}

async function refreshEnriched(id: string, details: PlaceDetails): Promise<void> {
  if (isDryRun) {
    console.log(`  DRY RUN: would UPDATE places SET ${describeWrite(details)} WHERE id=${id}`);
    return;
  }
  await pool.query(
    `UPDATE places
     SET hours_json = $1,
         google_price_level = $2,
         lat = COALESCE($3, lat),
         lng = COALESCE($4, lng),
         google_photo_name = $5,
         google_photo_attribution = $6,
         enrichment_status = 'ok',
         enriched_at = NOW()
     WHERE id = $7`,
    [
      details.regularOpeningHours ? JSON.stringify(details.regularOpeningHours) : null,
      toNumericPrice(details.priceLevel),
      details.lat,
      details.lng,
      details.photoName,
      details.photoAttribution,
      id,
    ]
  );
}

async function markFailed(id: string): Promise<void> {
  if (isDryRun) {
    console.log(`  DRY RUN: would UPDATE places SET enrichment_status=failed WHERE id=${id}`);
    return;
  }
  await pool.query(
    `UPDATE places SET enrichment_status = 'failed' WHERE id = $1`,
    [id]
  );
}

// ---------------------------------------------------------------------------
// Main enrichment modes
// ---------------------------------------------------------------------------

async function runBackfill(): Promise<{
  processed: number;
  ok: number;
  failed: number;
  skipped: number;
}> {
  const result = await pool.query<BackfillPlace>(
    `SELECT id, name, address
     FROM places
     WHERE address IS NOT NULL AND google_place_id IS NULL
     ORDER BY name
     ${limit !== null ? `LIMIT ${limit}` : ''}`
  );

  const places = result.rows;
  console.log(`Backfill: found ${places.length} place(s) to enrich`);

  let ok = 0;
  let failed = 0;
  const skipped = 0;

  for (const place of places) {
    console.log(`Processing: "${place.name}"`);

    // Step 1: Resolve Google place_id via Text Search
    const googlePlaceId = await resolveGooglePlaceId(place.name, place.address);
    await sleep(100);

    if (!googlePlaceId) {
      console.error(`  Failed to resolve place_id for "${place.name}"`);
      await markFailed(place.id);
      failed++;
      continue;
    }

    // Step 2: Fetch details using resolved place_id
    const details = await fetchPlaceDetails(googlePlaceId, place.name);
    await sleep(100);

    if (!details) {
      console.error(`  Failed to fetch details for "${place.name}"`);
      await markFailed(place.id);
      failed++;
      continue;
    }

    // Step 3: Store results
    try {
      await markEnriched(place.id, googlePlaceId, details);
      console.log(
        `  OK: ${googlePlaceId}` +
          (details.lat !== null ? ` @ ${details.lat},${details.lng}` : ' (no location)') +
          (details.photoName ? ' +photo' : ' (no photo)')
      );
      ok++;
    } catch (err) {
      console.error(`  DB write failed for "${place.name}":`, err);
      await markFailed(place.id);
      failed++;
    }
  }

  return { processed: places.length, ok, failed, skipped };
}

async function runRefresh(): Promise<{
  processed: number;
  ok: number;
  failed: number;
  skipped: number;
}> {
  const result = await pool.query<RefreshPlace>(
    `SELECT id, name, google_place_id
     FROM places
     WHERE google_place_id IS NOT NULL
       ${isForce ? '' : "AND (enriched_at IS NULL OR enriched_at < NOW() - INTERVAL '7 days')"}
     ORDER BY enriched_at NULLS FIRST, name
     ${limit !== null ? `LIMIT ${limit}` : ''}`
  );

  const places = result.rows;
  console.log(`Refresh: found ${places.length} ${isForce ? '' : 'stale '}place(s) to re-enrich`);

  let ok = 0;
  let failed = 0;
  const skipped = 0;

  for (const place of places) {
    console.log(`Refreshing: "${place.name}" (${place.google_place_id})`);

    const details = await fetchPlaceDetails(place.google_place_id, place.name);
    await sleep(100);

    if (!details) {
      console.error(`  Failed to fetch details for "${place.name}"`);
      await markFailed(place.id);
      failed++;
      continue;
    }

    try {
      await refreshEnriched(place.id, details);
      console.log(
        `  OK` +
          (details.lat !== null ? ` @ ${details.lat},${details.lng}` : ' (no location)') +
          (details.photoName ? ' +photo' : ' (no photo)')
      );
      ok++;
    } catch (err) {
      console.error(`  DB write failed for "${place.name}":`, err);
      await markFailed(place.id);
      failed++;
    }
  }

  return { processed: places.length, ok, failed, skipped };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(
    `Mode: ${isRefresh ? 'refresh' : 'backfill'}` +
      (isRefresh && isForce ? ' (force: ignoring staleness)' : '') +
      (limit !== null ? ` (limit ${limit})` : '') +
      (isDryRun ? ' [DRY RUN: no database writes]' : '')
  );

  const summary = isRefresh ? await runRefresh() : await runBackfill();

  console.log(
    `Enrichment ${isDryRun ? 'dry run' : 'complete'}: ${summary.processed} processed, ` +
      `${summary.ok} ok, ${summary.failed} failed, ${summary.skipped} skipped` +
      (isDryRun ? ' (nothing written)' : '')
  );
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
