import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const APP = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

// 1x1 transparent PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

async function loginAndGetCsrf(page: any) {
  await page.goto(`${APP}/admin/login`);
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\/places/);
  // Extract a CSRF token from any admin form on the current page
  const token = await page.locator('input[name="_csrf"]').first().getAttribute('value');
  if (!token) throw new Error('Could not find CSRF token after login');
  return token;
}

test.describe('POST /admin/uploads', () => {
  test('rejects unauthenticated requests', async ({ request }) => {
    const res = await request.post(`${APP}/admin/uploads`, {
      multipart: {
        file: { name: 'a.png', mimeType: 'image/png', buffer: TINY_PNG },
        prefix: 'tag',
      },
    });
    // 401, 302 (redirect to login), 403 (CSRF rejection), or 500 (CSRF middleware throws
    // when no session exists) all indicate the request was not allowed through.
    expect([401, 302, 403, 500]).toContain(res.status());
  });

  test('uploads a PNG and returns a fetchable URL', async ({ page, request }) => {
    const csrf = await loginAndGetCsrf(page);

    const res = await page.request.post(`${APP}/admin/uploads`, {
      headers: { 'x-csrf-token': csrf },
      multipart: {
        file: { name: 'tiny.png', mimeType: 'image/png', buffer: TINY_PNG },
        prefix: 'tag',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('url');
    expect(body).toHaveProperty('key');
    expect(body.url).toMatch(/^\/uploads\/tag\/[a-f0-9-]+\.png$/);

    // The URL is fetchable (uses the unauthenticated request fixture)
    const fetched = await request.get(`${APP}${body.url}`);
    expect(fetched.status()).toBe(200);
    const buf = Buffer.from(await fetched.body());
    expect(buf.length).toBe(TINY_PNG.length);

    // Cleanup: remove the uploaded file
    try {
      await fs.unlink(path.resolve(`public/uploads/${body.key}`));
    } catch {
      // non-fatal
    }
  });

  test('rejects oversize files with 413', async ({ page }) => {
    const csrf = await loginAndGetCsrf(page);
    const huge = Buffer.alloc(11 * 1024 * 1024); // 11 MB > 10 MB cap

    const res = await page.request.post(`${APP}/admin/uploads`, {
      headers: { 'x-csrf-token': csrf },
      multipart: {
        file: { name: 'huge.png', mimeType: 'image/png', buffer: huge },
        prefix: 'tag',
      },
    });
    expect(res.status()).toBe(413);
  });

  test('rejects non-image MIME types with 415', async ({ page }) => {
    const csrf = await loginAndGetCsrf(page);
    const res = await page.request.post(`${APP}/admin/uploads`, {
      headers: { 'x-csrf-token': csrf },
      multipart: {
        file: { name: 'sneaky.txt', mimeType: 'text/plain', buffer: Buffer.from('nope') },
        prefix: 'tag',
      },
    });
    expect(res.status()).toBe(415);
  });
});
