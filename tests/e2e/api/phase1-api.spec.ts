/**
 * Phase 1 acceptance-criteria tests
 *
 * Covers T1.1 (GET /api/places/:id) and T1.2 (GET /api/tags?structured=1)
 *
 * Criteria map:
 *
 * T1.1-AC1  valid uuid -> 200 with full body shape
 * T1.1-AC2  lat and lng present, value null (Phase 1 baseline)
 * T1.1-AC3  non-existent valid uuid -> 404 {error: 'Place not found'}
 * T1.1-AC4  non-uuid path param -> 404 (not 500)
 * T1.1-AC5  GET /api/places list shape includes original keys plus new additive fields (lat, lng, pitch, crowd_level, price_tier, photo_url, hours_json, cross_street)
 * T1.1-AC7  Content-Type: application/json on detail endpoint
 *
 * T1.2-AC1  no query param -> flat array [{value, display, order}] with order as string
 * T1.2-AC2  ?structured=1 -> {parents, standalone} with correct shape
 * T1.2-AC3  ?structured=true -> flat shape (not structured)
 * T1.2-AC4  ?structured=0 and ?structured= -> flat shape
 * T1.2-AC5  order field is a STRING, not a number
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// ─── T1.1: GET /api/places/:id ────────────────────────────────────────────────

test.describe('T1.1 — GET /api/places/:id', () => {
  let knownId: string;

  test.beforeAll(async ({ request }) => {
    // Get a real ID from the list endpoint
    const res = await request.get(`${BASE_URL}/api/places`);
    const places = await res.json();
    if (places.length > 0) {
      knownId = places[0].key;
    }
  });

  // T1.1-AC1: valid existing uuid returns 200 with full body shape
  test('T1.1-AC1: valid uuid returns 200 with full body shape {key, name, address, phone, url, specials, categories, notes, tags, created_at, updated_at, lat, lng, pitch, perfect, insider, crowd, vibe, crowd_level, price_tier, cross_street, photo_url, photo_credit, google_place_id, hours_json, google_price_level, enrichment_status, enriched_at}', async ({
    request,
  }) => {
    test.skip(!knownId, 'No places in DB — skip shape test');
    const res = await request.get(`${BASE_URL}/api/places/${knownId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const expectedKeys = [
      'key', 'name', 'address', 'phone', 'url',
      'specials', 'categories', 'notes', 'tags',
      'created_at', 'updated_at', 'lat', 'lng',
      'pitch', 'perfect', 'insider', 'crowd', 'vibe',
      'crowd_level', 'price_tier', 'cross_street',
      'photo_url', 'photo_credit', 'google_place_id',
      'hours_json', 'google_price_level', 'enrichment_status', 'enriched_at',
    ];
    for (const k of expectedKeys) {
      expect(body, `missing key: ${k}`).toHaveProperty(k);
    }
    expect(Array.isArray(body.tags)).toBe(true);
  });

  // T1.1-AC2: lat and lng are present with value null (Phase 1 baseline)
  test('T1.1-AC2: lat and lng keys are present, value null when not yet geocoded', async ({
    request,
  }) => {
    test.skip(!knownId, 'No places in DB — skip lat/lng test');
    const res = await request.get(`${BASE_URL}/api/places/${knownId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('lat');
    expect(body).toHaveProperty('lng');
    // Phase 1 DB has no lat/lng columns populated — must be null
    expect(body.lat).toBeNull();
    expect(body.lng).toBeNull();
  });

  // T1.1-AC3: non-existent valid uuid -> 404 {error: 'Place not found'}
  test("T1.1-AC3: non-existent valid uuid returns 404 {error: 'Place not found'}", async ({
    request,
  }) => {
    const res = await request.get(
      `${BASE_URL}/api/places/00000000-0000-0000-0000-000000000000`
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Place not found' });
  });

  // T1.1-AC4: non-uuid path param -> 404, not 500
  test('T1.1-AC4: non-uuid path param "abc" returns 404 (not 500)', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/places/abc`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('Place not found');
  });

  test('T1.1-AC4b: non-uuid path param "not-a-uuid" returns 404 (not 500)', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/places/not-a-uuid`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  // T1.1-AC5: list endpoint includes original keys plus new additive fields
  test('T1.1-AC5: GET /api/places list response contains original keys and new additive fields', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/places`);
    expect(res.status()).toBe(200);
    const places = await res.json();
    expect(Array.isArray(places)).toBe(true);
    if (places.length > 0) {
      const item = places[0];
      // Original keys that must still be present
      const originalKeys = [
        'key', 'name', 'address', 'phone', 'url',
        'specials', 'categories', 'notes', 'tags',
        'created_at', 'updated_at',
      ];
      const actualKeys = Object.keys(item);
      for (const k of originalKeys) {
        expect(actualKeys, `list item missing key: ${k}`).toContain(k);
      }
      // New additive fields are now present in the list response
      expect(actualKeys).toContain('lat');
      expect(actualKeys).toContain('lng');
      expect(actualKeys).toContain('pitch');
      expect(actualKeys).toContain('crowd_level');
      expect(actualKeys).toContain('price_tier');
      expect(actualKeys).toContain('photo_url');
      expect(actualKeys).toContain('hours_json');
      expect(actualKeys).toContain('cross_street');
    }
  });

  // T1.1-AC7: Content-Type application/json on detail endpoint
  test('T1.1-AC7: detail endpoint sets Content-Type: application/json', async ({
    request,
  }) => {
    test.skip(!knownId, 'No places in DB');
    const res = await request.get(`${BASE_URL}/api/places/${knownId}`);
    expect(res.headers()['content-type']).toMatch(/application\/json/);
  });
});

// ─── T1.2: GET /api/tags (flat + structured) ─────────────────────────────────

test.describe('T1.2 — GET /api/tags with structured param', () => {
  // T1.2-AC1: no query param -> flat array [{value, display, order}]
  test('T1.2-AC1: no query param returns flat array with {value, display, order}', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/tags`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      const tag = body[0];
      expect(tag).toHaveProperty('value');
      expect(tag).toHaveProperty('display');
      expect(tag).toHaveProperty('order');
      // Must NOT have keys from the structured shape
      expect(tag).not.toHaveProperty('parents');
      expect(tag).not.toHaveProperty('standalone');
    }
  });

  // T1.2-AC2: ?structured=1 -> {parents, standalone} with correct nested shape
  test('T1.2-AC2: ?structured=1 returns {parents: [...], standalone: [...]} shape', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/tags?structured=1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('parents');
    expect(body).toHaveProperty('standalone');
    expect(Array.isArray(body.parents)).toBe(true);
    expect(Array.isArray(body.standalone)).toBe(true);
    // Each parent must have value, display, order, children
    for (const parent of body.parents) {
      expect(parent).toHaveProperty('value');
      expect(parent).toHaveProperty('display');
      expect(parent).toHaveProperty('order');
      expect(parent).toHaveProperty('children');
      expect(Array.isArray(parent.children)).toBe(true);
      // Each child must have value, display, order
      for (const child of parent.children) {
        expect(child).toHaveProperty('value');
        expect(child).toHaveProperty('display');
        expect(child).toHaveProperty('order');
      }
    }
    // Each standalone must have value, display, order but no children
    for (const s of body.standalone) {
      expect(s).toHaveProperty('value');
      expect(s).toHaveProperty('display');
      expect(s).toHaveProperty('order');
    }
  });

  // T1.2-AC3: ?structured=true -> flat shape (only '1' opts in)
  test('T1.2-AC3: ?structured=true returns flat array (not structured)', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/tags?structured=true`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // T1.2-AC4a: ?structured=0 -> flat shape
  test('T1.2-AC4a: ?structured=0 returns flat array', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/tags?structured=0`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // T1.2-AC4b: ?structured= (empty value) -> flat shape
  test('T1.2-AC4b: ?structured= (empty) returns flat array', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/tags?structured=`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // T1.2-AC5: order field is a STRING, not a number — critical lock
  test('T1.2-AC5: order field is a STRING in flat response (locked behavior)', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/tags`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    if (body.length > 0) {
      expect(typeof body[0].order).toBe('string');
    }
  });

  test('T1.2-AC5b: order field is a STRING in structured response', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/tags?structured=1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Check parent order
    for (const p of body.parents) {
      expect(typeof p.order, `parent ${p.value} order should be string`).toBe('string');
      for (const c of p.children) {
        expect(typeof c.order, `child ${c.value} order should be string`).toBe('string');
      }
    }
    for (const s of body.standalone) {
      expect(typeof s.order, `standalone ${s.value} order should be string`).toBe('string');
    }
  });
});
