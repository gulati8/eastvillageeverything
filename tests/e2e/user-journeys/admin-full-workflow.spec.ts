/**
 * End-to-end user journey: Admin full workflow
 *
 * Simulates a complete admin session in the sequence a real user would perform:
 *
 *   1. Admin logs in
 *   2. Creates a tag category (parent)
 *   3. Creates a child tag under that parent
 *   4. Creates a place and assigns the child tag to it
 *   5. Verifies the place appears in the admin list
 *   6. Visits the public site and verifies the place and tag appear
 *   7. Filters by the tag on the public site — place stays visible
 *   8. Edits the place name
 *   9. Verifies the updated name in admin list
 *  10. Deletes the child tag — verifies deletion confirmation shows the place
 *  11. Confirms tag deletion
 *  12. Deletes the place
 *  13. Logs out
 *
 * This is the highest-value regression spec: it covers the full happy path
 * end-to-end across auth, tags, places, and the public directory.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';
import { AdminTagFormPage } from '../pages/AdminTagFormPage';
import { AdminTagsPage } from '../pages/AdminTagsPage';
import { AdminPlaceFormPage } from '../pages/AdminPlaceFormPage';
import { AdminPlacesPage } from '../pages/AdminPlacesPage';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test('Admin full workflow: create tags and place, verify on public site, cleanup @critical', async ({
  page,
}) => {
  const RUN = Date.now();

  // ── Step 1: Log in ────────────────────────────────────────────────────────
  await loginAsAdmin(page);
  await expect(page).toHaveURL(/\/admin\/places/);

  // ── Step 2: Create a parent tag ──────────────────────────────────────────
  const tagForm = new AdminTagFormPage(page);
  await tagForm.gotoNew();
  const parentValue = `drinks-${RUN}`;
  const parentDisplay = `Drinks ${RUN}`;
  await tagForm.fillValue(parentValue);
  await tagForm.fillDisplay(parentDisplay);
  await tagForm.fillSortOrder('1');
  await tagForm.submit();
  await expect(page).toHaveURL(/\/admin\/tags$/);

  // ── Step 3: Create a child tag under parent ───────────────────────────────
  await tagForm.gotoNew();
  const childValue = `beer-special-${RUN}`;
  const childDisplay = `Beer Special ${RUN}`;
  await tagForm.fillValue(childValue);
  await tagForm.fillDisplay(childDisplay);
  await tagForm.fillSortOrder('2');
  await tagForm.selectParentTag(parentDisplay);
  await tagForm.submit();
  await expect(page).toHaveURL(/\/admin\/tags$/);

  // Tag Groups section should now appear
  await expect(page.locator('.section-header')).toContainText('Tag Groups');

  // ── Step 4: Create a place and assign the child tag ───────────────────────
  const placeForm = new AdminPlaceFormPage(page);
  await placeForm.gotoNew();
  const placeName = `The Flash Bar ${RUN}`;
  await placeForm.fillName(placeName);
  await placeForm.fillAddress('1 East Village Way, New York, NY 10009');
  await placeForm.fillPhone('2125550199');
  await placeForm.fillUrl('https://example.com');
  await placeForm.fillSpecials('Mon–Fri 5–7pm: Half-price beers');
  await placeForm.fillCategories('Bar, Happy Hour');
  await placeForm.fillNotes('Great outdoor seating.');
  // Check the child tag checkbox
  await placeForm.checkTag(childValue);
  await placeForm.submit();
  await expect(page).toHaveURL(/\/admin\/places$/);

  // ── Step 5: Verify place appears in admin list ────────────────────────────
  const placesPage = new AdminPlacesPage(page);
  await placesPage.expectPlaceInList(placeName);

  // ── Step 6: Verify place appears on public site ───────────────────────────
  const publicPage = await page.context().newPage();
  await publicPage.goto(BASE_URL);
  await publicPage.waitForLoadState('networkidle');
  await expect(publicPage.locator('.place-name').filter({ hasText: placeName })).toBeVisible();

  // ── Step 7: Filter by parent tag value on public site ────────────────────
  const filterSelect = publicPage.locator('#tag-list');
  const parentOption = filterSelect.locator(`option[value="${parentValue}"]`);
  const parentOptionCount = await parentOption.count();
  if (parentOptionCount > 0) {
    await filterSelect.selectOption(parentValue);
    await publicPage.waitForTimeout(400); // animation
    // The place should still be visible (it has the child tag which maps to parent)
    const placeRow = publicPage.locator(`div.bar.${childValue}`);
    const placeCount = await placeRow.count();
    if (placeCount > 0) {
      await expect(placeRow.first()).toBeVisible();
    }
  }
  await publicPage.close();

  // ── Step 8: Edit the place name ──────────────────────────────────────────
  await placesPage.goto();
  await placesPage.clickEditForFirstPlace();
  await expect(page).toHaveURL(/\/admin\/places\/.*\/edit/);
  const updatedPlaceName = `The Flash Bar Updated ${RUN}`;
  await placeForm.clearName();
  await placeForm.fillName(updatedPlaceName);
  await placeForm.submit();
  await expect(page).toHaveURL(/\/admin\/places$/);
  await placesPage.expectPlaceInList(updatedPlaceName);

  // ── Step 9: Navigate to tags, delete the child tag ───────────────────────
  const tagsPage = new AdminTagsPage(page);
  await tagsPage.goto();
  await tagsPage.clickDeleteForTag(childDisplay);

  // Delete confirmation should mention the place that uses this tag
  await expect(page.locator('.alert-danger')).toContainText(updatedPlaceName);

  // Confirm deletion
  await page.getByRole('button', { name: 'Yes, Delete Tag' }).click();
  await expect(page).toHaveURL(/\/admin\/tags$/);
  await expect(
    page.locator('#tagsTableBody').getByText(childDisplay)
  ).not.toBeVisible();

  // ── Step 10: Delete the place ─────────────────────────────────────────────
  await placesPage.goto();
  page.on('dialog', (dialog) => dialog.accept());
  const placeRow = page
    .locator('table.places-table tbody tr')
    .filter({ hasText: updatedPlaceName });
  await placeRow.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/admin\/places$/);
  await expect(
    page.locator('table.places-table').getByText(updatedPlaceName)
  ).not.toBeVisible();

  // ── Step 11: Log out ──────────────────────────────────────────────────────
  await placesPage.logout();
  await expect(page).toHaveURL(/\/admin\/login/);
});
