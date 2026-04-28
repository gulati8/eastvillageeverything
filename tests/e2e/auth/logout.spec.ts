import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/auth';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

test.describe('Admin authentication — logout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('logout button is present in the navbar @critical', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('clicking logout redirects to login page @critical', async ({ page }) => {
    await page.locator('form[action="/admin/logout"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('after logout, protected routes redirect to login', async ({ page }) => {
    await page.locator('form[action="/admin/logout"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/login/);

    // Try to visit places directly
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('after logout, session is cleared — tags protected route also redirects', async ({
    page,
  }) => {
    await page.locator('form[action="/admin/logout"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
