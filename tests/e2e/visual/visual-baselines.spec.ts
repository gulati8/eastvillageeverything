/**
 * Visual regression tests.
 *
 * These capture baseline screenshots for critical pages and compare against them
 * on subsequent runs. The first run will generate the baselines; after that,
 * any deviation beyond the threshold fails the test.
 *
 * Covered pages:
 *   - Public home — desktop (1280x720)
 *   - Public home — mobile (390x844)
 *   - Admin login page
 *   - Admin places list — desktop
 *   - Admin new place form
 *   - Admin tags list
 *   - Admin new tag form
 *
 * Configuration:
 *   - maxDiffPixelRatio: 0.02 (from playwright.config.ts)
 *   - Snapshots stored in tests/e2e/__snapshots__/
 *
 * Run with --update-snapshots to regenerate baselines after intentional UI changes.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Visual baselines — public site', () => {
  test('public home desktop baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    // Mask dynamic content (timestamps, etc.) if any
    await expect(page).toHaveScreenshot('public-home-desktop.png', {
      fullPage: true,
    });
  });

  test('public home mobile baseline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('public-home-mobile.png', {
      fullPage: true,
    });
  });
});

test.describe('Visual baselines — admin site', () => {
  test('admin login page baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login.png');
  });

  test('admin places list baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    // Mask the date cells — they change every run
    await expect(page).toHaveScreenshot('admin-places-list.png', {
      mask: [page.locator('.date-cell')],
    });
  });

  test('admin new place form baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-place-form-new.png');
  });

  test('admin tags list baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tags-list.png');
  });

  test('admin new tag form baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-tag-form-new.png');
  });
});
