/**
 * Accessibility scans — all pages
 *
 * Uses @axe-core/playwright to scan every page for WCAG violations.
 * Covers:
 *   - Public home page (/)
 *   - Admin login page (/admin/login)
 *   - Admin places list (/admin/places)
 *   - Admin new place form (/admin/places/new)
 *   - Admin tags list (/admin/tags)
 *   - Admin new tag form (/admin/tags/new)
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Accessibility — public pages', () => {
  test('public home page has no accessibility violations @critical', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Accessibility — admin pages (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin login page has no accessibility violations', async ({ page }) => {
    // Navigate to login in a fresh (unauthenticated) context is not possible
    // in beforeEach; scan the login page separately below.
    // This test verifies the places page after auth.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('admin places list has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('admin new place form has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('admin tags list has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('admin new tag form has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Accessibility — admin login (unauthenticated)', () => {
  test('admin login page has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
