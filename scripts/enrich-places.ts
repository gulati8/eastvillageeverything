/**
 * Google Places Enrichment Script
 *
 * Backfill mode (default):
 *   npx tsx scripts/enrich-places.ts
 *   Resolves google_place_id via Text Search, then fetches hours + price for places
 *   that have an address but no google_place_id yet.
 *
 * Refresh mode:
 *   npx tsx scripts/enrich-places.ts --refresh
 *   Re-fetches hours + price for places with a google_place_id that are stale (>7 days).
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
 * Returns the place_id string (e.g. "places/ChIJ...") or null on failure.
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

/**
 * Fetch regularOpeningHours and priceLevel for a given Google place_id.
 * Returns the raw fields or null on failure.
 */
async function fetchPlaceDetails(
  googlePlaceId: string,
  placeName: string
): Promise<{ regularOpeningHours: unknown; priceLevel: string | null } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/${googlePlaceId}`,
      {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'X-Goog-Api-Key': apiKey as string,
          'X-Goog-FieldMask': 'regularOpeningHours,priceLevel',
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
    };

    return {
      regularOpeningHours: data.regularOpeningHours ?? null,
      priceLevel: data.priceLevel ?? null,
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

async function markEnriched(
  id: string,
  googlePlaceId: string,
  hoursJson: unknown,
  priceLevel: string | null
): Promise<void> {
  const numericPrice =
    priceLevel !== null ? (PRICE_LEVEL_MAP[priceLevel] ?? null) : null;

  await pool.query(
    `UPDATE places
     SET google_place_id = $1,
         hours_json = $2,
         google_price_level = $3,
         enrichment_status = 'ok',
         enriched_at = NOW()
     WHERE id = $4`,
    [googlePlaceId, hoursJson ? JSON.stringify(hoursJson) : null, numericPrice, id]
  );
}

async function refreshEnriched(
  id: string,
  hoursJson: unknown,
  priceLevel: string | null
): Promise<void> {
  const numericPrice =
    priceLevel !== null ? (PRICE_LEVEL_MAP[priceLevel] ?? null) : null;

  await pool.query(
    `UPDATE places
     SET hours_json = $1,
         google_price_level = $2,
         enrichment_status = 'ok',
         enriched_at = NOW()
     WHERE id = $3`,
    [hoursJson ? JSON.stringify(hoursJson) : null, numericPrice, id]
  );
}

async function markFailed(id: string): Promise<void> {
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
     WHERE address IS NOT NULL AND google_place_id IS NULL`
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
      await markEnriched(
        place.id,
        googlePlaceId,
        details.regularOpeningHours,
        details.priceLevel
      );
      console.log(`  OK: ${googlePlaceId}`);
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
       AND (enriched_at IS NULL OR enriched_at < NOW() - INTERVAL '7 days')`
  );

  const places = result.rows;
  console.log(`Refresh: found ${places.length} stale place(s) to re-enrich`);

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
      await refreshEnriched(
        place.id,
        details.regularOpeningHours,
        details.priceLevel
      );
      console.log(`  OK`);
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
  console.log(`Mode: ${isRefresh ? 'refresh' : 'backfill'}`);

  const summary = isRefresh ? await runRefresh() : await runBackfill();

  console.log(
    `Enrichment complete: ${summary.processed} processed, ` +
      `${summary.ok} ok, ${summary.failed} failed, ${summary.skipped} skipped`
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
