/**
 * Visual regression tests — screenshot snapshots
 *
 * These tests capture screenshots of key pages and compare them to baseline
 * images stored in tests/e2e/__snapshots__/. On first run they create the
 * baseline; on subsequent runs they diff against it.
 *
 * Run with: npx playwright test --project=desktop-chrome visual/
 * Update snapshots: npx playwright test --update-snapshots visual/
 *
 * Covered pages:
 *   - Public home page (desktop 1280px, mobile 375px)
 *   - Admin login page
 *   - Admin places list
 *   - Admin new place form
 *   - Admin tags list
 *
 * Note: Visual tests are intentionally separate from functional tests and
 * should only be run on stable data states. They use a generous threshold
 * to tolerate minor font-rendering differences across OS/browser combos.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// Visual tests are brittle across machines — skip in CI unless explicitly enabled
const SKIP_VISUAL = process.env.SKIP_VISUAL === '1';

test.describe('Visual — Public Site', () => {
  test.skip(SKIP_VISUAL, 'Visual tests skipped (set SKIP_VISUAL=0 to enable)');

  test('public home page — desktop 1280px snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('public home page — mobile 375px snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Visual — Admin Site', () => {
  test.skip(SKIP_VISUAL, 'Visual tests skipped (set SKIP_VISUAL=0 to enable)');

  test('admin login page — desktop snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-desktop.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('admin places list — desktop snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('admin places list — mobile 375px snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-places-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('admin new place form — desktop snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-place-form-new-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('admin tags list — desktop snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tags-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('admin new tag form — desktop snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tag-form-new-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
