import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../utils/auth';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

/**
 * Admin REST API tests.
 *
 * These tests exercise the JSON API endpoints under /admin/api/.
 * Authentication is established via a real login before each test.
 * CSRF is handled by extracting the session cookie — the API accepts
 * x-csrf-token header which is injected by the client JS.
 */
test.describe('Admin API — places (authenticated)', () => {
  let sessionCookie: string;
  let csrfToken: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Capture session cookie
    const cookies = await page.context().cookies();
    sessionCookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    // Extract CSRF token from page
    csrfToken = await page.evaluate(() => {
      const metaOrForm = document.querySelector('input[name="_csrf"]') as HTMLInputElement | null;
      return metaOrForm ? metaOrForm.value : '';
    });
  });

  test('GET /admin/api/places returns 200 with array @critical', async ({ request, page }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get(`${ADMIN_BASE_URL}/admin/api/places`, {
      headers: { Cookie: cookie },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /admin/api/me returns current user @critical', async ({ request, page }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get(`${ADMIN_BASE_URL}/admin/api/me`, {
      headers: { Cookie: cookie },
    });
    expect(response.status()).toBe(200);
    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
  });

  test('GET /admin/api/places/:id returns 404 for non-existent place', async ({
    request,
    page,
  }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get(
      `${ADMIN_BASE_URL}/admin/api/places/00000000-0000-0000-0000-000000000000`,
      { headers: { Cookie: cookie } }
    );
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('GET /admin/api/tags returns 200 with array', async ({ request, page }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get(`${ADMIN_BASE_URL}/admin/api/tags`, {
      headers: { Cookie: cookie },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /admin/api/tags/:id returns 404 for non-existent tag', async ({
    request,
    page,
  }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get(
      `${ADMIN_BASE_URL}/admin/api/tags/00000000-0000-0000-0000-000000000000`,
      { headers: { Cookie: cookie } }
    );
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('DELETE /admin/api/places/:id returns 404 for non-existent place', async ({
    request,
    page,
  }) => {
    await loginAsAdmin(page);
    const cookies = await page.context().cookies();
    const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const csrf = await page.evaluate(() => {
      const el = document.querySelector('input[name="_csrf"]') as HTMLInputElement | null;
      return el ? el.value : '';
    });

    const response = await request.delete(
      `${ADMIN_BASE_URL}/admin/api/places/00000000-0000-0000-0000-000000000000`,
      {
        headers: {
          Cookie: cookie,
          'x-csrf-token': csrf,
        },
      }
    );
    expect(response.status()).toBe(404);
  });
});

test.describe('Admin API — unauthenticated', () => {
  test('GET /admin/api/places returns 401 without auth', async ({ request }) => {
    const response = await request.get(`${ADMIN_BASE_URL}/admin/api/places`);
    expect(response.status()).toBe(401);
  });

  test('GET /admin/api/me returns 401 without auth', async ({ request }) => {
    const response = await request.get(`${ADMIN_BASE_URL}/admin/api/me`);
    expect(response.status()).toBe(401);
  });

  test('GET /admin/api/tags returns 401 without auth', async ({ request }) => {
    const response = await request.get(`${ADMIN_BASE_URL}/admin/api/tags`);
    expect(response.status()).toBe(401);
  });
});
