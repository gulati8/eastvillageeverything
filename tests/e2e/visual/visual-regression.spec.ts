/**
 * Visual regression — screenshot baselines
 *
 * Captures full-page screenshots at desktop (1280px) and mobile (375px) for
 * every key page. Run with `--update-snapshots` on first pass to establish baselines.
 *
 * Covers:
 *   - Public home page — desktop baseline
 *   - Public home page — mobile baseline
 *   - Admin login page — desktop baseline
 *   - Admin places list — desktop baseline
 *   - Admin places list — mobile baseline
 *   - Admin new place form — desktop baseline
 *   - Admin tags list — desktop baseline
 *   - Admin new tag form — desktop baseline
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Visual regression — public site', () => {
  test('public home page desktop baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-desktop.png', {
      fullPage: true,
    });
  });

  test('public home page mobile baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-mobile.png', {
      fullPage: true,
    });
  });

  test('public home page tablet baseline', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-tablet.png', {
      fullPage: true,
    });
  });
});

test.describe('Visual regression — admin pages', () => {
  test('admin login page desktop baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-desktop.png', {
      fullPage: true,
    });
  });

  test('admin login page mobile baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-mobile.png', {
      fullPage: true,
    });
  });

  test('admin places list desktop baseline', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-desktop.png', {
      fullPage: true,
    });
  });

  test('admin places list mobile baseline', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-mobile.png', {
      fullPage: true,
    });
  });

  test('admin new place form desktop baseline', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-place-form-desktop.png', {
      fullPage: true,
    });
  });

  test('admin tags list desktop baseline', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tags-desktop.png', {
      fullPage: true,
    });
  });

  test('admin new tag form desktop baseline', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tag-form-desktop.png', {
      fullPage: true,
    });
  });
});
