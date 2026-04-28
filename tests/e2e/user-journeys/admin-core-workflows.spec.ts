/**
 * Cross-feature user journeys
 *
 * These tests span multiple feature areas and represent the most critical
 * end-to-end workflows that must work for the application to serve its purpose.
 *
 * Covers:
 *   - Admin logs in, creates a place, views it in list, edits it, deletes it @critical
 *   - Admin logs in, creates a tag, creates a place with that tag, verifies tag on place @critical
 *   - Admin logs in, deletes a tag that is assigned to a place (sees warning) @critical
 *   - Admin creates a place with a URL, public directory shows clickable link
 *   - Admin creates a place, public API returns it @critical
 *   - Full place CRUD lifecycle: create -> edit -> verify update -> delete -> verify gone
 *   - Full tag CRUD lifecycle: create -> assign to place -> delete (with warning) -> confirm
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/auth';
import { AdminPlaceFormPage } from '../pages/AdminPlaceFormPage';
import { AdminPlacesPage } from '../pages/AdminPlacesPage';
import { AdminTagFormPage } from '../pages/AdminTagFormPage';
import { AdminTagsPage } from '../pages/AdminTagsPage';
import { AdminTagDeletePage } from '../pages/AdminTagDeletePage';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('User journey: full place CRUD lifecycle @critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can create, view, edit, and delete a place @critical', async ({ page }) => {
    const ts = Date.now();
    const originalName = `Journey Bar ${ts}`;
    const updatedName = `Journey Bar Updated ${ts}`;

    // Step 1: Create a place
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    await form.fillName(originalName);
    await form.fillAddress('123 Avenue A, New York, NY 10009');
    await form.fillPhone('2125559876');
    await form.fillSpecials('Mon–Fri 5–7pm: $4 beers');
    await form.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    // Step 2: Verify in list
    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList(originalName);

    // Step 3: Edit the place
    await placesPage.clickEditForFirstPlace();
    await form.expectHeadingEdit();
    await form.fillName(updatedName);
    await form.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);
    await placesPage.expectPlaceInList(updatedName);

    // Step 4: Delete the place
    page.on('dialog', (dialog) => dialog.accept());
    const deleteForm = page.locator('form[action*="/delete"]').first();
    await deleteForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/places$/);
    await expect(page.locator('table.places-table').getByText(updatedName)).not.toBeVisible();
  });
});

test.describe('User journey: full tag CRUD lifecycle @critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can create, edit, and delete a tag @critical', async ({ page }) => {
    const ts = Date.now();
    const tagValue = `journey-tag-${ts}`;
    const tagDisplay = `Journey Tag ${ts}`;
    const updatedDisplay = `Journey Tag Updated ${ts}`;

    // Step 1: Create a tag
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    await form.fillValue(tagValue);
    await form.fillDisplay(tagDisplay);
    await form.fillSortOrder('99');
    await form.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);

    // Step 2: Verify in list
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.expectTagInList(tagDisplay);

    // Step 3: Edit the tag
    await tagsPage.clickEditForTag(tagDisplay);
    await form.fillDisplay(updatedDisplay);
    await form.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await tagsPage.expectTagInList(updatedDisplay);

    // Step 4: Delete the tag
    await tagsPage.clickDeleteForTag(updatedDisplay);
    const deletePage = new AdminTagDeletePage(page);
    await deletePage.expectHeadingVisible();
    await deletePage.confirmDelete();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await expect(page.locator('#tagsTableBody').getByText(updatedDisplay)).not.toBeVisible();
  });
});

test.describe('User journey: tag assigned to place — delete shows warning @critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('deleting a tag used by a place shows affected-places warning', async ({ page }) => {
    const ts = Date.now();
    const tagValue = `warn-tag-${ts}`;
    const tagDisplay = `Warning Tag ${ts}`;
    const placeName = `Warning Place ${ts}`;

    // Create the tag
    const tagForm = new AdminTagFormPage(page);
    await tagForm.gotoNew();
    await tagForm.fillValue(tagValue);
    await tagForm.fillDisplay(tagDisplay);
    await tagForm.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);

    // Create a place and check the tag checkbox
    const placeForm = new AdminPlaceFormPage(page);
    await placeForm.gotoNew();
    await placeForm.fillName(placeName);
    await placeForm.checkTag(tagValue);
    await placeForm.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    // Navigate to tag delete confirmation — it should show the affected place
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickDeleteForTag(tagDisplay);
    const deletePage = new AdminTagDeletePage(page);
    await deletePage.expectAffectedPlaceWarning(placeName);
  });
});

test.describe('User journey: place with URL shows link on public directory @critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('place created with URL renders as a link on the public page', async ({ page }) => {
    const ts = Date.now();
    const placeName = `Link Test Bar ${ts}`;
    const placeUrl = 'https://example.com/bar';

    // Create the place
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    await form.fillName(placeName);
    await form.fillUrl(placeUrl);
    await form.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    // Visit the public directory
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // The place name should appear as a link
    const placeLink = page.locator('a.place-name').filter({ hasText: placeName });
    await expect(placeLink).toBeVisible();
    await expect(placeLink).toHaveAttribute('href', placeUrl);
  });
});

test.describe('User journey: place appears in public API @critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('place created via admin is returned by public /api/places endpoint', async ({
    page,
    request,
  }) => {
    const ts = Date.now();
    const placeName = `API Test Bar ${ts}`;

    // Create the place
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    await form.fillName(placeName);
    await form.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    // Verify it appears in the public API
    const response = await request.get(`${BASE_URL}/api/places`);
    expect(response.status()).toBe(200);
    const places = await response.json();
    const found = places.find((p: { name: string }) => p.name === placeName);
    expect(found).toBeDefined();
    expect(found.name).toBe(placeName);
  });
});
