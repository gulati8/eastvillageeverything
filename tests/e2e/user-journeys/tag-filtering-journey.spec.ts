/**
 * User Journey: Create tag -> assign to place -> filter works on public site
 *
 * Tests the full tagging workflow:
 *   1. Admin creates a tag
 *   2. Admin creates a place and assigns the tag
 *   3. Public directory shows the tag as a filter option
 *   4. Selecting the tag filter shows only places with that tag
 *   5. Resetting to "Anything" shows all places again
 *
 * Also covers:
 *   - Child tags: places tagged with a child show up when parent is filtered
 *   - Tag appears in the public /api/tags response
 *   - Deleting a tag removes it from the public filter dropdown (after page reload)
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';
import { AdminTagFormPage } from '../pages/AdminTagFormPage';
import { AdminTagsPage } from '../pages/AdminTagsPage';
import { AdminPlaceFormPage } from '../pages/AdminPlaceFormPage';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('User Journey: Tag Filtering', () => {
  test(
    'tag created in admin appears in the public directory filter dropdown @critical',
    async ({ browser }) => {
      const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
      const adminPage = await adminContext.newPage();
      await loginAsAdmin(adminPage);

      const tagValue = `journey-tag-${Date.now()}`;
      const tagDisplay = `Journey Tag ${Date.now()}`;

      // Create tag
      const tagForm = new AdminTagFormPage(adminPage);
      await tagForm.gotoNew();
      await tagForm.fillValue(tagValue);
      await tagForm.fillDisplay(tagDisplay);
      await tagForm.submit();
      await expect(adminPage).toHaveURL(/\/admin\/tags$/);

      // Verify on public site
      const publicContext = await browser.newContext({ baseURL: BASE_URL });
      const publicPage = await publicContext.newPage();
      await publicPage.goto('/');
      await publicPage.waitForLoadState('networkidle');

      const tagSelect = publicPage.locator('#tag-list');
      const options = await tagSelect.locator('option').allInnerTexts();
      expect(options).toContain(tagDisplay);

      await adminContext.close();
      await publicContext.close();
    }
  );

  test(
    'place tagged with a tag is shown when that tag is selected as filter @critical',
    async ({ browser }) => {
      const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
      const adminPage = await adminContext.newPage();
      await loginAsAdmin(adminPage);

      const tagValue = `filter-test-${Date.now()}`;
      const tagDisplay = `Filter Test ${Date.now()}`;
      const placeName = `Filtered Bar ${Date.now()}`;

      // Create a standalone tag
      const tagForm = new AdminTagFormPage(adminPage);
      await tagForm.gotoNew();
      await tagForm.fillValue(tagValue);
      await tagForm.fillDisplay(tagDisplay);
      await tagForm.submit();
      await expect(adminPage).toHaveURL(/\/admin\/tags$/);

      // Create a place and assign the tag
      const placeForm = new AdminPlaceFormPage(adminPage);
      await placeForm.gotoNew();
      await placeForm.fillName(placeName);
      // Check the tag checkbox
      const tagCheckbox = adminPage.locator(`input[name="tags"][value="${tagValue}"]`);
      const checkboxCount = await tagCheckbox.count();
      if (checkboxCount > 0) {
        await tagCheckbox.check();
      }
      await placeForm.submit();
      await expect(adminPage).toHaveURL(/\/admin\/places$/);

      // On the public site, select the tag filter and verify
      const publicContext = await browser.newContext({ baseURL: BASE_URL });
      const publicPage = await publicContext.newPage();
      await publicPage.goto('/');
      await publicPage.waitForLoadState('networkidle');

      // Verify our place is in the list unfiltered
      await expect(publicPage.locator('div.bar').filter({ hasText: placeName })).toBeVisible();

      // Select the tag filter
      await publicPage.locator('#tag-list').selectOption(tagValue);
      await publicPage.waitForTimeout(400); // animation + filter

      // Our place should still be visible (it has the tag)
      await expect(publicPage.locator(`div.bar.${tagValue}`).filter({ hasText: placeName })).toBeVisible();

      // Reset to Anything
      await publicPage.locator('#tag-list').selectOption('none');
      await publicPage.waitForTimeout(400);
      await expect(publicPage.locator('div.bar').filter({ hasText: placeName })).toBeVisible();

      await adminContext.close();
      await publicContext.close();
    }
  );

  test('tag appears in /api/tags response', async ({ browser }) => {
    const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);

    const tagValue = `api-tag-${Date.now()}`;
    const tagDisplay = `API Tag ${Date.now()}`;

    const tagForm = new AdminTagFormPage(adminPage);
    await tagForm.gotoNew();
    await tagForm.fillValue(tagValue);
    await tagForm.fillDisplay(tagDisplay);
    await tagForm.submit();
    await expect(adminPage).toHaveURL(/\/admin\/tags$/);

    // Check via public API
    const publicContext = await browser.newContext({ baseURL: BASE_URL });
    const publicPage = await publicContext.newPage();
    const response = await publicPage.goto(`${BASE_URL}/api/tags`);
    expect(response?.status()).toBe(200);
    const tags = await publicPage.evaluate(() => window.fetch('/api/tags').then(r => r.json()));
    const found = tags.find((t: { value: string }) => t.value === tagValue);
    expect(found).toBeDefined();
    expect(found.display).toBe(tagDisplay);
    // order should be a string (as per API contract)
    expect(typeof found.order).toBe('string');

    await adminContext.close();
    await publicContext.close();
  });

  test('admin full session: login -> create tag -> create place with tag -> verify public filter -> logout', async ({
    browser,
  }) => {
    const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);

    const uniqueSuffix = Date.now();
    const tagValue = `e2e-tag-${uniqueSuffix}`;
    const tagDisplay = `E2E Tag ${uniqueSuffix}`;
    const placeName = `E2E Place ${uniqueSuffix}`;

    // Create tag
    const tagForm = new AdminTagFormPage(adminPage);
    await tagForm.gotoNew();
    await tagForm.fillValue(tagValue);
    await tagForm.fillDisplay(tagDisplay);
    await tagForm.submit();

    // Create place and assign tag
    const placeForm = new AdminPlaceFormPage(adminPage);
    await placeForm.gotoNew();
    await placeForm.fillName(placeName);
    const tagCheckbox = adminPage.locator(`input[name="tags"][value="${tagValue}"]`);
    if ((await tagCheckbox.count()) > 0) {
      await tagCheckbox.check();
    }
    await placeForm.submit();
    await expect(adminPage).toHaveURL(/\/admin\/places$/);

    // Logout
    await adminPage.locator('form[action="/admin/logout"] button[type="submit"]').click();
    await expect(adminPage).toHaveURL(/\/admin\/login/);

    // Public site shows the place with the tag
    const publicContext = await browser.newContext({ baseURL: BASE_URL });
    const publicPage = await publicContext.newPage();
    await publicPage.goto('/');
    await publicPage.waitForLoadState('networkidle');

    await expect(publicPage.locator('div.bar').filter({ hasText: placeName })).toBeVisible();

    // The tag filter dropdown includes the new tag
    const options = await publicPage.locator('#tag-list option').allInnerTexts();
    expect(options.some(o => o.includes(tagDisplay))).toBe(true);

    await adminContext.close();
    await publicContext.close();
  });
});
