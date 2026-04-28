/**
 * Visual regression baselines
 *
 * Captures full-page screenshots at desktop and mobile for each key page.
 * On first run use `--update-snapshots` to establish baselines.
 * These snapshots are committed to tests/e2e/__snapshots__/.
 *
 * Covers:
 *   - Public home page at desktop (1280px)
 *   - Public home page at mobile (375px)
 *   - Admin login page at desktop
 *   - Admin login page at mobile
 *   - Admin places list at desktop (authenticated)
 *   - Admin places list at mobile (authenticated)
 *   - Admin tags list at desktop (authenticated)
 *   - Admin new place form at desktop (authenticated)
 *   - Admin new tag form at desktop (authenticated)
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

test.describe('Visual regression — public home', () => {
  test('public home page desktop baseline (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('public home page mobile baseline (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('Visual regression — admin login', () => {
  test('admin login page desktop baseline (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('admin login page mobile baseline (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('Visual regression — authenticated admin pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('places list desktop baseline (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('places list mobile baseline (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('tags list desktop baseline (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tags-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('new place form desktop baseline (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-place-form-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('new tag form desktop baseline (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tag-form-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
