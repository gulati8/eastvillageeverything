/**
 * Playwright test fixtures.
 *
 * Provides pre-authenticated admin page and named page objects so tests
 * can import from one place.
 *
 * Usage:
 *   import { test, expect } from '../fixtures';
 *   test('my test', async ({ adminPage, publicPage }) => { ... });
 */
import { test as base, expect, type Page } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';
import { PublicDirectoryPage } from '../pages/PublicDirectoryPage';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { AdminPlacesPage } from '../pages/AdminPlacesPage';
import { AdminPlaceFormPage } from '../pages/AdminPlaceFormPage';
import { AdminTagsPage } from '../pages/AdminTagsPage';
import { AdminTagFormPage } from '../pages/AdminTagFormPage';

type Fixtures = {
  // Raw pages with useful context
  publicPage: Page;
  adminPage: Page; // pre-authenticated admin page

  // Page objects
  publicDirectoryPage: PublicDirectoryPage;
  adminLoginPage: AdminLoginPage;
  adminPlacesPage: AdminPlacesPage;
  adminPlaceFormPage: AdminPlaceFormPage;
  adminTagsPage: AdminTagsPage;
  adminTagFormPage: AdminTagFormPage;
};

export const test = base.extend<Fixtures>({
  publicPage: async ({ page }, use) => {
    await use(page);
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const page = await context.newPage();
    await loginAsAdmin(page);
    await use(page);
    await context.close();
  },

  publicDirectoryPage: async ({ page }, use) => {
    await use(new PublicDirectoryPage(page));
  },

  adminLoginPage: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const page = await context.newPage();
    await use(new AdminLoginPage(page));
    await context.close();
  },

  adminPlacesPage: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const page = await context.newPage();
    await loginAsAdmin(page);
    await use(new AdminPlacesPage(page));
    await context.close();
  },

  adminPlaceFormPage: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const page = await context.newPage();
    await loginAsAdmin(page);
    await use(new AdminPlaceFormPage(page));
    await context.close();
  },

  adminTagsPage: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const page = await context.newPage();
    await loginAsAdmin(page);
    await use(new AdminTagsPage(page));
    await context.close();
  },

  adminTagFormPage: async ({ browser }, use) => {
    const context = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const page = await context.newPage();
    await loginAsAdmin(page);
    await use(new AdminTagFormPage(page));
    await context.close();
  },
});

export { expect };
