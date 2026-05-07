import { test, expect } from '@playwright/test';

const API = process.env.API_BASE_URL ?? 'http://localhost:3000';

test.describe('GET /api/neighborhoods', () => {
  test('returns at least the default East Village', async ({ request }) => {
    const res = await request.get(`${API}/api/neighborhoods`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    const def = body.find((n: any) => n.is_default === true);
    expect(def).toBeTruthy();
    expect(def.value).toBe('east-village');
    expect(def.display).toBe('East Village');
  });

  test('every entry has id, value, display, is_default, order', async ({ request }) => {
    const res = await request.get(`${API}/api/neighborhoods`);
    const body = await res.json();
    for (const n of body) {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('value');
      expect(n).toHaveProperty('display');
      expect(n).toHaveProperty('is_default');
      expect(n).toHaveProperty('order');
      expect(typeof n.is_default).toBe('boolean');
    }
  });
});

test.describe('GET /api/places — neighborhood_id and tag order', () => {
  test('every place has a neighborhood_id', async ({ request }) => {
    const res = await request.get(`${API}/api/places?limit=10`);
    const body = await res.json();
    for (const place of body) {
      expect(place.neighborhood_id).toBeTruthy();
      expect(typeof place.neighborhood_id).toBe('string');
    }
  });

  test('place tags are returned in per-place sort_order', async ({ request }) => {
    const list = await request.get(`${API}/api/places?limit=200`);
    const places = await list.json();
    const target = places.find((p: any) => Array.isArray(p.tags) && p.tags.length >= 2);
    if (!target) {
      test.skip(true, 'No places with 2+ tags in test fixture');
      return;
    }
    const detail = await request.get(`${API}/api/places/${target.key}`);
    const detailBody = await detail.json();
    expect(detailBody.tags).toEqual(target.tags);
  });
});
