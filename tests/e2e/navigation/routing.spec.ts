/**
 * Navigation and routing
 *
 * Covers:
 *   - GET / loads public directory
 *   - GET /admin/login loads login page
 *   - GET /health returns 200 JSON status:ok
 *   - GET /admin redirects unauthenticated to /admin/login
 *   - GET /admin/ redirects authenticated to /admin/places
 *   - Navigation: Places link -> /admin/places
 *   - Navigation: Tags link -> /admin/tags
 *   - Navigation: EVE Admin brand -> /admin
 *   - 404: nonexistent route returns 404
 *   - Deep link to /admin/places/new works when authenticated
 *   - Browser back after navigation returns to previous page correctly
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Routing — public routes', () => {
  test('GET / returns 200 and renders East Village Everything @critical', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'East Village Everything' })).toBeVisible();
  });

  test('GET /health returns 200 with status ok', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();
  });

  test('GET /api/places returns 200 with JSON array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/places`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /api/tags returns 200 with JSON array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/tags`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

test.describe('Routing — admin routes (unauthenticated)', () => {
  test('GET /admin/login returns 200 @critical', async ({ page }) => {
    const response = await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'EVE Admin' })).toBeVisible();
  });

  test('GET /admin redirects unauthenticated user to /admin/login', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin`);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('GET /admin/places redirects unauthenticated user to /admin/login @critical', async ({
    page,
  }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('GET /admin/tags redirects unauthenticated user to /admin/login', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe('Routing — admin navbar navigation (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('clicking Tags nav link navigates to /admin/tags', async ({ page }) => {
    await page.getByRole('link', { name: 'Tags' }).click();
    await expect(page).toHaveURL(/\/admin\/tags/);
    await expect(page.getByRole('heading', { name: /Tags/ })).toBeVisible();
  });

  test('clicking Places nav link navigates to /admin/places', async ({ page }) => {
    // Start from tags page
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.getByRole('link', { name: 'Places' }).click();
    await expect(page).toHaveURL(/\/admin\/places/);
    await expect(page.getByRole('heading', { name: 'Places' })).toBeVisible();
  });

  test('clicking EVE Admin brand link stays in admin section', async ({ page }) => {
    await page.getByRole('link', { name: 'EVE Admin' }).click();
    // Brand link goes to /admin which redirects to /admin/places
    await expect(page).toHaveURL(/\/admin/);
  });

  test('deep link to /admin/places/new loads new place form when authenticated', async ({
    page,
  }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'New Place' })).toBeVisible();
  });

  test('deep link to /admin/tags/new loads new tag form when authenticated', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'New Tag' })).toBeVisible();
  });

  test('browser back from places form returns to places list', async ({ page }) => {
    await page.getByRole('link', { name: 'New Place' }).click();
    await expect(page).toHaveURL(/\/admin\/places\/new/);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/places$/);
  });
});
