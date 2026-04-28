/**
 * Shared Playwright test fixtures.
 *
 * Provides:
 *   - `adminPage`: A page that is already logged in as admin
 *   - `loggedOutPage`: A plain page (no session)
 *   - `adminLoginPage`, `adminPlacesPage`, `adminTagsPage` etc. — pre-constructed page objects
 *
 * Usage:
 *   import { test } from '../../fixtures/test-fixtures';
 *   test('...', async ({ adminPage }) => { ... });
 */

import { test as base, Page } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminPlacesPage } from '../pages/AdminPlacesPage';
import { AdminTagsPage } from '../pages/AdminTagsPage';
import { PublicHomePage } from '../pages/PublicHomePage';

// Credentials — set via environment or fall back to dev defaults.
export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@example.com';
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'password';

// Reusable helper: log in via the UI and return a session-bearing page.
async function loginAsAdmin(page: Page): Promise<void> {
  const loginPage = new AdminLoginPage(page);
  await loginPage.goto();
  await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  // After login the server redirects to /admin/places
  await page.waitForURL(/\/admin\/places/);
}

type Fixtures = {
  adminPage: Page;
  adminLoginPage: AdminLoginPage;
  adminPlacesPage: AdminPlacesPage;
  adminTagsPage: AdminTagsPage;
  publicHomePage: PublicHomePage;
};

export const test = base.extend<Fixtures>({
  // A browser page that already has an active admin session.
  adminPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },

  // Page objects — constructed on demand; adminPage is used where auth is needed.
  adminLoginPage: async ({ page }, use) => {
    await use(new AdminLoginPage(page));
  },

  adminPlacesPage: async ({ adminPage }, use) => {
    await use(new AdminPlacesPage(adminPage));
  },

  adminTagsPage: async ({ adminPage }, use) => {
    await use(new AdminTagsPage(adminPage));
  },

  publicHomePage: async ({ page }, use) => {
    await use(new PublicHomePage(page));
  },
});

export { expect } from '@playwright/test';
