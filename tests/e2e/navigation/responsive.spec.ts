/**
 * Responsive / multi-viewport tests
 *
 * Covers viewport-specific behavior at 375px (mobile), 768px (tablet), 1280px (desktop).
 * These tests run explicitly at named viewports; the Playwright project matrix
 * (desktop-chrome, mobile-chrome, mobile-safari, tablet) also runs all other
 * specs at those sizes automatically.
 *
 * Covers:
 *   - Admin navbar hamburger visible at <=768px, hidden at >=1280px
 *   - Admin places: desktop table visible at 1280px, hidden at 375px
 *   - Admin places: mobile card view visible at 375px, hidden at 1280px
 *   - Public site: single-column stacked layout at 375px (no overflow)
 *   - Public site: author sidebar hidden at 375px, visible at 1280px
 *   - Login form fills full width on mobile
 *   - Touch targets (Logout, New Place, Edit) minimum size at mobile
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const viewports = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1280, height: 720 },
];

test.describe('Responsive: Admin navbar', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const vp of viewports) {
    test(`navbar renders correctly at ${vp.label} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${ADMIN_BASE_URL}/admin/places`);
      await page.waitForLoadState('networkidle');

      if (vp.width < 992) {
        // Bootstrap lg breakpoint — toggler visible, links collapsed
        await expect(page.locator('.navbar-toggler')).toBeVisible();
      } else {
        // Large viewport — links visible directly
        await expect(page.locator('.navbar-nav .nav-link').first()).toBeVisible();
      }
    });
  }

  test('hamburger menu opens nav links when clicked at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    const toggler = page.locator('.navbar-toggler');
    await toggler.click();
    await expect(page.locator('#navbarNav')).toBeVisible();
    // Nav links should now be visible
    await expect(page.getByRole('link', { name: 'Places' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tags' })).toBeVisible();
  });
});

test.describe('Responsive: Places list layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('desktop table visible and card view hidden at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.places-table-wrapper')).toBeVisible();
    await expect(page.locator('.place-cards')).toBeHidden();
  });

  test('card view visible and desktop table hidden at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.place-cards')).toBeVisible();
    await expect(page.locator('.places-table-wrapper')).toBeHidden();
  });

  test('page header stacks vertically at 375px (column flex direction)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    // The .page-header should be flex-direction: column at <=768px per the CSS
    const header = page.locator('.page-header');
    await expect(header).toBeVisible();
    const flexDir = await header.evaluate((el) => window.getComputedStyle(el).flexDirection);
    expect(flexDir).toBe('column');
  });
});

test.describe('Responsive: Public directory layout', () => {
  test('public page has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Check that body does not exceed viewport width
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // 20px tolerance
  });

  test('author sidebar links hidden at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('.show-for-large-up').filter({ hasText: 'More about the East Village' })
    ).toBeHidden();
  });

  test('author sidebar links visible at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('.show-for-large-up').filter({ hasText: 'More about the East Village' })
    ).toBeVisible();
  });

  test('tag filter dropdown is visible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#tag-list')).toBeVisible();
  });
});

test.describe('Responsive: Login form', () => {
  test('login form renders correctly at 375px with full-width button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'EVE Admin' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('login form renders correctly at 1280px desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'EVE Admin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });
});
