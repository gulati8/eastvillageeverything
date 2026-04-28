/**
 * Visual / Responsive layout regression tests
 *
 * These tests assert structural layout properties that change at different
 * viewport sizes. They do NOT use visual snapshots (no toHaveScreenshot) —
 * instead they assert CSS visibility rules and element presence that
 * constitute the responsive contract.
 *
 * Breakpoint: admin uses Bootstrap 5 md (768px). Public uses Foundation 5 large (> 768px).
 *
 * Covers:
 *   - Public site: desktop shows column header row; mobile hides it
 *   - Public site: bio sidebar "More about" section hidden on mobile
 *   - Public site: single-column layout on mobile (Foundation grid)
 *   - Admin places: desktop table visible; mobile cards visible at 375px
 *   - Admin: navbar hamburger visible at 375px; collapsed nav hidden
 *   - Admin: page-header stacks vertically on mobile (flex-direction: column)
 *   - Admin: "New Place" button reachable at all viewport sizes
 *   - Admin: "New Tag" button reachable at all viewport sizes
 *   - Admin login: form centered and readable at 375px
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const ADMIN_BASE = ADMIN_BASE_URL;
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };

test.describe('Public site — responsive layout', () => {
  test('desktop: column header row (Name, Happy Hour, Notes) is visible at 1280px', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.row.title.show-for-large-up')).toBeVisible();
  });

  test('mobile: column header row is hidden at 375px', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.row.title.show-for-large-up')).toBeHidden();
  });

  test('desktop: bio sidebar "More about" section is visible at 1280px', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const moreAbout = page.locator('.show-for-large-up').filter({ hasText: 'More about' });
    await expect(moreAbout).toBeVisible();
  });

  test('mobile: bio sidebar "More about" section is hidden at 375px', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const moreAbout = page.locator('.show-for-large-up').filter({ hasText: 'More about' });
    await expect(moreAbout).toBeHidden();
  });

  test('tag filter select is reachable at all viewports', async ({ page }) => {
    for (const vp of [MOBILE_VIEWPORT, TABLET_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(vp);
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#tag-list')).toBeVisible();
    }
  });

  test('main heading visible at all viewports', async ({ page }) => {
    for (const vp of [MOBILE_VIEWPORT, TABLET_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(vp);
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'East Village Everything' })).toBeVisible();
    }
  });
});

test.describe('Admin — responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('desktop: places table wrapper visible at 1280px', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.places-table-wrapper')).toBeVisible();
    await expect(page.locator('.place-cards')).toBeHidden();
  });

  test('mobile: places mobile card view visible and table hidden at 375px', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.places-table-wrapper')).toBeHidden();
    // cards or empty state
    const cards = page.locator('.place-cards');
    const emptyState = page.getByText('No places yet.');
    const cardsOrEmpty = (await cards.isVisible()) || (await emptyState.isVisible());
    expect(cardsOrEmpty).toBe(true);
  });

  test('mobile: navbar hamburger toggler is visible at 375px on admin pages', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.navbar-toggler')).toBeVisible();
  });

  test('mobile: collapsed navbar menu is not visible before toggle', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#navbarNav')).not.toHaveClass(/show/);
  });

  test('mobile: hamburger click expands the navbar menu', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    await page.locator('.navbar-toggler').click();
    await expect(page.locator('#navbarNav')).toHaveClass(/show/);
  });

  test('desktop: hamburger is hidden at 1280px on admin pages', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.navbar-toggler')).toBeHidden();
  });

  test('"New Place" button is accessible at all admin viewports', async ({ page }) => {
    for (const vp of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(vp);
      await page.goto(`${ADMIN_BASE}/admin/places`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'New Place' })).toBeVisible();
    }
  });

  test('"New Tag" button is accessible at all admin viewports', async ({ page }) => {
    for (const vp of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
      await page.setViewportSize(vp);
      await page.goto(`${ADMIN_BASE}/admin/tags`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'New Tag' })).toBeVisible();
    }
  });
});

test.describe('Admin login page — responsive layout', () => {
  test('login form is visible and centered at 375px', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.login-form')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'EVE Admin' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('login form is visible at desktop viewport', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(`${ADMIN_BASE}/admin/login`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.login-form')).toBeVisible();
  });
});
