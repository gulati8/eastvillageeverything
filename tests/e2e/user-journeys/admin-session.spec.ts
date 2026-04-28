/**
 * User journey: Admin session management
 *
 * Covers:
 *   - Login → browse places → browse tags → logout → re-login in one session
 *   - Session persists across page navigation within same browser context
 *   - Logout clears session; immediate re-access to protected page redirects
 *   - Two separate browser contexts (two "users") are independent sessions
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, logoutFromAdmin, ADMIN_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from '../utils/auth';

const ADMIN_BASE = ADMIN_BASE_URL;

test.describe('User journey: admin session management', () => {
  test('full session: login -> places -> tags -> logout', async ({ page }) => {
    // Login
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin\/places/);

    // Navigate to tags
    await page.getByRole('link', { name: 'Tags' }).click();
    await expect(page).toHaveURL(/\/admin\/tags/);
    await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible();

    // Navigate back to places
    await page.getByRole('link', { name: 'Places' }).click();
    await expect(page).toHaveURL(/\/admin\/places/);

    // Logout
    await logoutFromAdmin(page);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('session persists across multiple page loads within same context', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate away and back several times
    await page.goto(`${ADMIN_BASE}/admin/tags`);
    await expect(page).toHaveURL(/\/admin\/tags/);

    await page.goto(`${ADMIN_BASE}/admin/places/new`);
    await expect(page).toHaveURL(/\/admin\/places\/new/);

    await page.goto(`${ADMIN_BASE}/admin/tags/new`);
    await expect(page).toHaveURL(/\/admin\/tags\/new/);

    // Should still be authenticated
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await expect(page).toHaveURL(/\/admin\/places/);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('two separate browser contexts have independent sessions', async ({ browser }) => {
    // First context: log in
    const context1 = await browser.newContext({ baseURL: ADMIN_BASE });
    const page1 = await context1.newPage();
    await loginAsAdmin(page1);
    await expect(page1).toHaveURL(/\/admin\/places/);

    // Second context: not logged in
    const context2 = await browser.newContext({ baseURL: ADMIN_BASE });
    const page2 = await context2.newPage();
    await page2.goto(`${ADMIN_BASE}/admin/places`);
    await expect(page2).toHaveURL(/\/admin\/login/);

    await context1.close();
    await context2.close();
  });

  test('logout then immediate access to /admin/places redirects to login', async ({ page }) => {
    await loginAsAdmin(page);
    await logoutFromAdmin(page);
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('heading', { name: 'EVE Admin' })).toBeVisible();
  });
});
