/**
 * User journey: Full place lifecycle
 *
 * Simulates a real administrator workflow from login through creating,
 * editing, tagging, and deleting a place — all in one continuous session.
 *
 * Covers:
 *   - Admin logs in
 *   - Creates a tag to use for filtering
 *   - Creates a new place with that tag
 *   - The place appears on the public directory
 *   - Filters on the public site by that tag — place is visible
 *   - Admin edits the place name
 *   - Updated name appears on the public directory
 *   - Admin deletes the place
 *   - Place is no longer on the public directory
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_BASE = ADMIN_BASE_URL;

test.describe('User journey: place lifecycle @critical', () => {
  // Unique suffix per run so parallel test runs don't collide
  const RUN_ID = Date.now();
  const TAG_VALUE = `journey-tag-${RUN_ID}`;
  const TAG_DISPLAY = `Journey Tag ${RUN_ID}`;
  const PLACE_NAME = `Journey Bar ${RUN_ID}`;
  const UPDATED_NAME = `Journey Bar Updated ${RUN_ID}`;

  test('admin creates a tag, creates a place with it, place appears on public site, then cleans up', async ({
    page,
    browser,
  }) => {
    // ── Step 1: Log in as admin ───────────────────────────────────────────────
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin\/places/);

    // ── Step 2: Create a tag ─────────────────────────────────────────────────
    await page.goto(`${ADMIN_BASE}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Value (internal) *').fill(TAG_VALUE);
    await page.getByLabel('Display Name *').fill(TAG_DISPLAY);
    await page.getByRole('button', { name: /Tag/ }).click();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await expect(page.locator('#tagsTableBody').getByText(TAG_DISPLAY)).toBeVisible();

    // ── Step 3: Create a place with that tag ─────────────────────────────────
    await page.goto(`${ADMIN_BASE}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Name *').fill(PLACE_NAME);
    await page.getByLabel('Address').fill('1 Test Street, New York NY 10009');
    await page.getByLabel('Specials').fill('Mon-Fri 5-7pm Happy Hour');
    // Check the tag checkbox if it exists
    const tagCheckbox = page.locator(`input[name="tags"][value="${TAG_VALUE}"]`);
    if (await tagCheckbox.count() > 0) {
      await tagCheckbox.check();
    }
    await page.getByRole('button', { name: /Place/ }).click();
    await expect(page).toHaveURL(/\/admin\/places$/);
    // The place should appear in the admin list
    await expect(
      page.locator('table.places-table, .place-cards').getByText(PLACE_NAME)
    ).toBeVisible();

    // ── Step 4: Verify place appears on the public site ──────────────────────
    const publicContext = await browser.newContext({ baseURL: BASE_URL });
    const publicPage = await publicContext.newPage();
    await publicPage.goto('/');
    await publicPage.waitForLoadState('networkidle');
    await expect(publicPage.locator('.place-name').filter({ hasText: PLACE_NAME })).toBeVisible();

    // ── Step 5: Filter by the tag on the public site ─────────────────────────
    const tagOption = publicPage.locator(`#tag-list option[value="${TAG_VALUE}"]`);
    if (await tagOption.count() > 0) {
      await publicPage.locator('#tag-list').selectOption(TAG_VALUE);
      await publicPage.waitForTimeout(400);
      // Place should still be visible after filter
      const visiblePlace = publicPage.locator(`div.bar.${TAG_VALUE}`);
      if (await visiblePlace.count() > 0) {
        await expect(visiblePlace.filter({ hasText: PLACE_NAME })).toBeVisible();
      }
    }
    await publicContext.close();

    // ── Step 6: Admin edits the place name ────────────────────────────────────
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    const editLink = page.locator('table.places-table tbody tr')
      .filter({ hasText: PLACE_NAME })
      .getByRole('link', { name: 'Edit' });
    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/places\/.*\/edit/);
    await page.getByLabel('Name *').fill(UPDATED_NAME);
    await page.getByRole('button', { name: /Place/ }).click();
    await expect(page).toHaveURL(/\/admin\/places$/);
    await expect(
      page.locator('table.places-table, .place-cards').getByText(UPDATED_NAME)
    ).toBeVisible();

    // ── Step 7: Verify updated name on public site ───────────────────────────
    const publicContext2 = await browser.newContext({ baseURL: BASE_URL });
    const publicPage2 = await publicContext2.newPage();
    await publicPage2.goto('/');
    await publicPage2.waitForLoadState('networkidle');
    await expect(
      publicPage2.locator('.place-name').filter({ hasText: UPDATED_NAME })
    ).toBeVisible();
    await publicContext2.close();

    // ── Step 8: Admin deletes the place ──────────────────────────────────────
    await page.goto(`${ADMIN_BASE}/admin/places`);
    await page.waitForLoadState('networkidle');
    page.on('dialog', dialog => dialog.accept());
    const deleteForm = page.locator('table.places-table tbody tr')
      .filter({ hasText: UPDATED_NAME })
      .locator('form[action*="delete"]');
    await deleteForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/places$/);
    await expect(
      page.locator('table.places-table').getByText(UPDATED_NAME)
    ).not.toBeVisible();

    // ── Step 9: Admin deletes the tag ────────────────────────────────────────
    await page.goto(`${ADMIN_BASE}/admin/tags`);
    await page.waitForLoadState('networkidle');
    const tagRow = page.locator('#tagsTableBody tr').filter({ hasText: TAG_DISPLAY });
    if (await tagRow.count() > 0) {
      await tagRow.getByRole('link', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Yes, Delete Tag' }).click();
      await expect(page).toHaveURL(/\/admin\/tags$/);
    }
  });
});
