import { test, expect } from '@playwright/test';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

/**
 * Verifies that all protected admin routes redirect unauthenticated visitors
 * to /admin/login. No session is established in beforeEach — these tests
 * intentionally run with no auth state.
 */
test.describe('Protected route redirects (unauthenticated)', () => {
  const protectedRoutes = [
    '/admin/places',
    '/admin/places/new',
    '/admin/tags',
    '/admin/tags/new',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated visitor to login @critical`, async ({ page }) => {
      await page.goto(`${ADMIN_BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  test('admin API /admin/api/me returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.get(
      `${ADMIN_BASE_URL}/admin/api/me`
    );
    expect(response.status()).toBe(401);
  });

  test('admin API /admin/api/places returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.get(
      `${ADMIN_BASE_URL}/admin/api/places`
    );
    expect(response.status()).toBe(401);
  });
});
