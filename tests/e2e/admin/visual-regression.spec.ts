/**
 * Visual regression baselines for key admin pages.
 *
 * Run with `--update-snapshots` on first pass to establish baselines.
 * Snapshots committed to tests/e2e/__snapshots__.
 *
 * Covers:
 *   - /admin/login — desktop (1280px) and mobile (375px)
 *   - /admin/places — desktop and mobile
 *   - /admin/places/new — desktop
 *   - /admin/tags — desktop and mobile
 *   - /admin/tags/new — desktop
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/auth';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

test.describe('Visual regression — login page', () => {
  test('admin/login desktop visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-desktop.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('admin/login mobile visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-mobile.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });
});

test.describe('Visual regression — authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin/places desktop visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-desktop.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('admin/places mobile visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-mobile.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('admin/places/new desktop visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-new-desktop.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('admin/tags desktop visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tags-desktop.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('admin/tags mobile visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tags-mobile.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('admin/tags/new desktop visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tags-new-desktop.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });
});
