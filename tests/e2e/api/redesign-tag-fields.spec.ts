import { test, expect } from '@playwright/test';

const API = process.env.API_BASE_URL ?? 'http://localhost:3000';

test.describe('GET /api/tags — redesign fields', () => {
  test('flat response includes is_primary/tint/accent/fallback_image_url on every tag', async ({ request }) => {
    const res = await request.get(`${API}/api/tags`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    for (const tag of body) {
      expect(tag).toHaveProperty('value');
      expect(tag).toHaveProperty('display');
      expect(tag).toHaveProperty('order');
      // New redesign fields — present (may be null/false but key must exist)
      expect(tag).toHaveProperty('is_primary');
      expect(tag).toHaveProperty('tint');
      expect(tag).toHaveProperty('accent');
      expect(tag).toHaveProperty('fallback_image_url');
      expect(typeof tag.is_primary).toBe('boolean');
    }
  });

  test('structured response includes redesign fields on parents, children, and standalone', async ({ request }) => {
    const res = await request.get(`${API}/api/tags?structured=1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('parents');
    expect(body).toHaveProperty('standalone');

    const checkTag = (t: any) => {
      expect(t).toHaveProperty('is_primary');
      expect(t).toHaveProperty('tint');
      expect(t).toHaveProperty('accent');
      expect(t).toHaveProperty('fallback_image_url');
    };

    for (const parent of body.parents) {
      checkTag(parent);
      for (const child of parent.children) checkTag(child);
    }
    for (const s of body.standalone) checkTag(s);
  });

  test('tags default to is_primary=false when unset', async ({ request }) => {
    const res = await request.get(`${API}/api/tags`);
    const body = await res.json();
    // At least one tag should be is_primary=false (this is the default for fresh data)
    const anyFalse = body.some((t: any) => t.is_primary === false);
    expect(anyFalse).toBe(true);
  });
});
