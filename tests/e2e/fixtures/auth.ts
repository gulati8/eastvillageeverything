import { test as base, type Page } from '@playwright/test';

/**
 * Test credentials — sourced from TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD env vars.
 * Set these in .env.test or pass via the shell when running the suite.
 */
export const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL ?? 'admin@eastvillageeverything.com',
  password: process.env.TEST_ADMIN_PASSWORD ?? 'Str0ng!Admin#2024',
  name: process.env.TEST_ADMIN_NAME ?? 'Admin User',
};

/**
 * Performs a login via the UI and returns the page already at /admin/places.
 * Use this in beforeEach hooks for tests that need an authenticated session.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(TEST_ADMIN.email);
  await page.getByLabel('Password').fill(TEST_ADMIN.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('/admin/places');
}

/**
 * Extended test fixture that auto-logs in before each test.
 */
export const authenticatedTest = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
});
