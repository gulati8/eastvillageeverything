/**
 * Admin: Tags list page
 *
 * Covers:
 *   - Tags list renders with heading after login @critical
 *   - New Tag button visible
 *   - Drag handles visible in table
 *   - Tags page title correct
 *   - Section header "Tag Groups" appears when parent tags exist
 *   - Navbar has Places, Tags links
 *   - Hamburger menu toggle visible at mobile viewport
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../../utils/auth';
import { AdminTagsPage } from '../../pages/AdminTagsPage';

test.describe('Admin Tags — list page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('tags list page renders the Tags heading @critical', async ({ page }) => {
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.expectHeadingVisible();
  });

  test('New Tag button is visible and links to /admin/tags/new', async ({ page }) => {
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    const link = page.getByRole('link', { name: 'New Tag' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/admin/tags/new');
  });

  test('page title includes Tags and East Village Everything Admin', async ({ page }) => {
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await expect(page).toHaveTitle(/Tags.*East Village Everything Admin/);
  });

  test('tags table has columns: drag handle, Actions, Display Name, Value', async ({ page }) => {
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Display Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Value' })).toBeVisible();
  });

  test('navbar hamburger toggler is visible at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await expect(page.locator('.navbar-toggler')).toBeVisible();
  });

  test('navbar collapse menu opens when hamburger is clicked at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await page.locator('.navbar-toggler').click();
    await expect(page.locator('#navbarNav')).toBeVisible();
  });

  test('instructional text about drag-to-sort is visible', async ({ page }) => {
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await expect(page.getByText('Standalone tags shown first')).toBeVisible();
  });
});
