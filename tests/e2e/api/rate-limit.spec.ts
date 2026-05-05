/**
 * Rate-limit acceptance tests for /api/*.
 *
 * REQUIRES: Server running with NODE_ENV=production (cap is 100/min in prod,
 * 1000/min in dev — tight loop won't hit dev cap reliably). Run with:
 *
 *   NODE_ENV=production npm run dev   # in one terminal
 *   npx playwright test tests/e2e/api/rate-limit.spec.ts --project=desktop-chrome
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Rate limiting on /api/*', () => {
  test('returns 429 after the cap is exceeded', async ({ request }) => {
    let saw429 = false;
    for (let i = 0; i < 110; i++) {
      const res = await request.get(`${BASE_URL}/api/places?limit=1`);
      if (res.status() === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
  });

  test('429 response includes Retry-After or RateLimit-Reset header', async ({ request }) => {
    for (let i = 0; i < 110; i++) {
      const res = await request.get(`${BASE_URL}/api/places?limit=1`);
      if (res.status() === 429) {
        const headers = res.headers();
        const hasRetryHint =
          'retry-after' in headers ||
          'ratelimit-reset' in headers ||
          'x-ratelimit-reset' in headers;
        expect(hasRetryHint).toBe(true);
        return;
      }
    }
    throw new Error('Never received 429 — server may not have rate limit applied or NODE_ENV is not production');
  });

  test('429 body is JSON with error field', async ({ request }) => {
    for (let i = 0; i < 110; i++) {
      const res = await request.get(`${BASE_URL}/api/places?limit=1`);
      if (res.status() === 429) {
        const body = await res.json();
        expect(typeof body.error).toBe('string');
        return;
      }
    }
    throw new Error('Never received 429');
  });
});
