/**
 * Pagination acceptance tests for GET /api/places.
 *
 * REQUIRES: Server running locally with at least 2 places in the DB. Run with:
 *
 *   npm run docker:dev   # in one terminal
 *   npx playwright test tests/e2e/api/pagination.spec.ts --project=desktop-chrome
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('GET /api/places pagination', () => {
  test('?limit=5 returns at most 5', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/places?limit=5`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(5);
  });

  test('limit clamped at 200 when caller asks higher', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/places?limit=999`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBeLessThanOrEqual(200);
  });

  test('?offset=1 returns rows starting from the second result', async ({ request }) => {
    const all = await (await request.get(`${BASE_URL}/api/places?limit=200`)).json();
    test.skip(all.length < 2, 'Need at least 2 places in DB');
    const offsetRes = await request.get(`${BASE_URL}/api/places?limit=200&offset=1`);
    const offset = await offsetRes.json();
    expect(offset[0]?.key).toBe(all[1]?.key);
  });

  test('invalid limit (non-numeric) ignored, returns default page', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/places?limit=foo`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('default (no params) returns the full result set — pagination is opt-in', async ({ request }) => {
    // The endpoint does not paginate unless ?limit is provided, so callers
    // that don't request pagination see every row. Compare the unpaginated
    // response to a request that explicitly asks for the max page size:
    // both should agree on the first 200 rows, but the unpaginated response
    // should match or exceed it in length.
    const unpaginated = await (await request.get(`${BASE_URL}/api/places`)).json();
    const paginated = await (await request.get(`${BASE_URL}/api/places?limit=200`)).json();
    expect(Array.isArray(unpaginated)).toBe(true);
    expect(unpaginated.length).toBeGreaterThanOrEqual(paginated.length);
    // First 200 (or fewer) rows align — same SQL ordering with/without LIMIT.
    const overlap = Math.min(paginated.length, unpaginated.length);
    for (let i = 0; i < overlap; i++) {
      expect(unpaginated[i].key).toBe(paginated[i].key);
    }
  });
});
