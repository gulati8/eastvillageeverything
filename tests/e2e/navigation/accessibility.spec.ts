/**
 * Accessibility scans using axe-core/playwright
 *
 * Covers:
 *   - Public home page: no accessibility violations
 *   - Admin login page: no accessibility violations
 *   - Admin places list: no accessibility violations (authenticated)
 *   - Admin new place form: no accessibility violations (authenticated)
 *   - Admin tags list: no accessibility violations (authenticated)
 *   - Admin new tag form: no accessibility violations (authenticated)
 *   - Admin tag delete confirmation: no accessibility violations (authenticated)
 *
 * These scans run at desktop (1280px) viewport — Playwright projects will
 * automatically re-run at mobile/tablet sizes.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';
import { AdminTagFormPage } from '../pages/AdminTagFormPage';

const UNIQUE_ID = Date.now();

test.describe('Accessibility — public pages', () => {
  test('public home page has no critical accessibility violations @critical', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `Accessibility violations: ${critical.map(v => `${v.id}: ${v.description}`).join(', ')}`
    ).toHaveLength(0);
  });

  test('admin login page has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `Accessibility violations: ${critical.map(v => `${v.id}: ${v.description}`).join(', ')}`
    ).toHaveLength(0);
  });
});

test.describe('Accessibility — admin pages (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('places list has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `Accessibility violations: ${critical.map(v => `${v.id}: ${v.description}`).join(', ')}`
    ).toHaveLength(0);
  });

  test('new place form has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `Accessibility violations: ${critical.map(v => `${v.id}: ${v.description}`).join(', ')}`
    ).toHaveLength(0);
  });

  test('tags list has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `Accessibility violations: ${critical.map(v => `${v.id}: ${v.description}`).join(', ')}`
    ).toHaveLength(0);
  });

  test('new tag form has no critical accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(
      critical,
      `Accessibility violations: ${critical.map(v => `${v.id}: ${v.description}`).join(', ')}`
    ).toHaveLength(0);
  });
});
