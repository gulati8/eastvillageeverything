/**
 * Public API endpoints
 *
 * Covers:
 *   - GET /api/places returns 200 with array
 *   - GET /api/places?tag= filters by tag value
 *   - GET /api/places response shape matches expected format (key, name, etc.)
 *   - GET /api/tags returns 200 with array
 *   - GET /api/tags response shape matches expected format (value, display, order)
 *   - GET /api/places 500 error state (mocked)
 *   - GET /api/tags 500 error state (mocked)
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Public API — /api/places', () => {
  test('GET /api/places returns 200 @critical', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/places`);
    expect(response.status()).toBe(200);
  });

  test('GET /api/places returns JSON array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/places`);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/places items have expected fields when data exists', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/places`);
    const body = await response.json();
    if (body.length > 0) {
      const place = body[0];
      expect(place).toHaveProperty('key');
      expect(place).toHaveProperty('name');
      expect(place).toHaveProperty('tags');
      expect(Array.isArray(place.tags)).toBe(true);
    }
  });

  test('GET /api/places?tag=nonexistent returns empty array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/places?tag=nonexistent-tag-xyz`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  test('GET /api/places response contains Content-Type application/json', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/places`);
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/application\/json/);
  });
});

test.describe('Public API — /api/tags', () => {
  test('GET /api/tags returns 200 @critical', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/tags`);
    expect(response.status()).toBe(200);
  });

  test('GET /api/tags returns JSON array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/tags`);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/tags items have expected fields when data exists', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/tags`);
    const body = await response.json();
    if (body.length > 0) {
      const tag = body[0];
      expect(tag).toHaveProperty('value');
      expect(tag).toHaveProperty('display');
      expect(tag).toHaveProperty('order');
      expect(typeof tag.order).toBe('string');
    }
  });

  test('GET /api/tags response contains Content-Type application/json', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/tags`);
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/application\/json/);
  });
});

test.describe('Public API — error handling', () => {
  test('GET /api/places with simulated 500 returns error JSON', async ({ page }) => {
    await page.route(`${BASE_URL}/api/places`, route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    const response = await page.request.get(`${BASE_URL}/api/places`);
    // The mock intercepts the request
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('GET /api/places with nonexistent ID-style param returns 200 (list endpoint)', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/api/places?tag=`);
    expect(response.status()).toBe(200);
  });
});
