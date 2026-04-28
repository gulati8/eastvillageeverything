/**
 * Admin navigation tests.
 *
 * Covers:
 *   - EVE Admin brand link navigates to /admin (then redirects to places)
 *   - Places nav link navigates to /admin/places
 *   - Tags nav link navigates to /admin/tags
 *   - /admin root redirects authenticated user to /admin/places
 *   - Breadcrumb / back navigation via Cancel buttons
 *   - Nav item is marked active on the current page
 *   - Mobile navbar hamburger opens the menu
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

test.describe('Admin navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('/admin redirects authenticated user to /admin/places', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin`);
    await page.waitForURL(/\/admin\/places/);
    await expect(page).toHaveURL(/\/admin\/places/);
  });

  test('EVE Admin brand link is visible and leads to admin area', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    const brand = page.getByRole('link', { name: 'EVE Admin' });
    await expect(brand).toBeVisible();
    await brand.click();
    // Brand navigates to /admin which redirects to /admin/places
    await expect(page).toHaveURL(/\/admin/);
  });

  test('Places nav link navigates to /admin/places', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Places' }).click();
    await expect(page).toHaveURL(/\/admin\/places/);
  });

  test('Tags nav link navigates to /admin/tags', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Tags' }).click();
    await expect(page).toHaveURL(/\/admin\/tags/);
  });

  test('"Places" nav item has active class on places list page', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    // The active nav item should contain "active" class
    const placesNavLink = page
      .locator('.navbar-nav .nav-item')
      .filter({ hasText: 'Places' })
      .locator('.nav-link');
    await expect(placesNavLink).toHaveClass(/active/);
  });

  test('"Tags" nav item has active class on tags list page', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    const tagsNavLink = page
      .locator('.navbar-nav .nav-item')
      .filter({ hasText: 'Tags' })
      .locator('.nav-link');
    await expect(tagsNavLink).toHaveClass(/active/);
  });

  test('New Place button on places list navigates to new place form', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'New Place' }).click();
    await expect(page).toHaveURL(/\/admin\/places\/new/);
  });

  test('New Tag button on tags list navigates to new tag form', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'New Tag' }).click();
    await expect(page).toHaveURL(/\/admin\/tags\/new/);
  });

  test('Cancel on new place form returns to /admin/places', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/admin\/places/);
  });

  test('Cancel on new tag form returns to /admin/tags', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/admin\/tags/);
  });

  test('mobile navbar hamburger toggles menu visibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    const toggler = page.locator('.navbar-toggler');
    await expect(toggler).toBeVisible();
    // Menu starts collapsed
    const menu = page.locator('#navbarNav');
    await expect(menu).not.toHaveClass(/show/);
    // Click to expand
    await toggler.click();
    await expect(menu).toHaveClass(/show/);
  });
});
