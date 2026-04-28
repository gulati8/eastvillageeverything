/**
 * Accessibility scans for all admin pages
 *
 * Uses @axe-core/playwright to scan every page for WCAG 2 violations.
 * Each page must have zero violations.
 *
 * Covers:
 *   - /admin/login accessibility scan
 *   - /admin/places accessibility scan
 *   - /admin/places/new accessibility scan
 *   - /admin/tags accessibility scan
 *   - /admin/tags/new accessibility scan
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsAdmin } from '../utils/auth';
import { AdminTagFormPage } from '../pages/AdminTagFormPage';
import { AdminTagsPage } from '../pages/AdminTagsPage';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

test.describe('Admin accessibility — unauthenticated pages', () => {
  test('/admin/login has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('Admin accessibility — authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('/admin/places has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('/admin/places/new has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('/admin/tags has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('/admin/tags/new has no accessibility violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('/admin/tags/:id/delete has no accessibility violations', async ({ page }) => {
    // Create a tag to get a real delete page
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    const ts = Date.now();
    await form.fillValue(`a11y-tag-${ts}`);
    await form.fillDisplay(`A11y Tag ${ts}`);
    await form.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickDeleteForTag(`A11y Tag ${ts}`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
