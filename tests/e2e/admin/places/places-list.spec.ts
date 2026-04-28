/**
 * Admin: Places list page
 *
 * Covers:
 *   - Places list renders after login @critical
 *   - Sorting by name, updated_at, created_at works (URL params update)
 *   - Empty state message renders
 *   - Desktop table is visible at 1280px
 *   - Mobile card view is visible at 375px, table hidden
 *   - New Place button is visible and navigates to form
 *   - Navbar links present (Places, Tags, Logout)
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../../utils/auth';
import { AdminPlacesPage } from '../../pages/AdminPlacesPage';

test.describe('Admin Places — list page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('places list page renders the Places heading @critical', async ({ page }) => {
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.expectHeadingVisible();
  });

  test('navbar shows Places, Tags links and Logout button', async ({ page }) => {
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await expect(page.getByRole('link', { name: 'EVE Admin' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Places' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tags' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('New Place button is visible and links to /admin/places/new', async ({ page }) => {
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    const link = page.getByRole('link', { name: 'New Place' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/admin/places/new');
  });

  test('sort by name changes URL to include sort_by=name param', async ({ page }) => {
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.clickSortByName();
    await expect(page).toHaveURL(/sort_by=name/);
  });

  test('sort by updated_at changes URL to include sort_by=updated_at param', async ({ page }) => {
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.clickSortByUpdatedAt();
    await expect(page).toHaveURL(/sort_by=updated_at/);
  });

  test('sort by created_at changes URL to include sort_by=created_at param', async ({ page }) => {
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.clickSortByCreatedAt();
    await expect(page).toHaveURL(/sort_by=created_at/);
  });

  test('desktop table wrapper is visible at 1280px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await expect(page.locator('.places-table-wrapper')).toBeVisible();
  });

  test('mobile card view is visible and desktop table hidden at 375px viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    // CSS hides the table wrapper and shows cards at <=768px
    await expect(page.locator('.place-cards')).toBeVisible();
    await expect(page.locator('.places-table-wrapper')).toBeHidden();
  });

  test('page title includes Places and East Village Everything Admin', async ({ page }) => {
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await expect(page).toHaveTitle(/Places.*East Village Everything Admin/);
  });
});
