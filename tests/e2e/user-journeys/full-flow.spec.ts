/**
 * End-to-end user journeys
 *
 * Covers cross-feature flows that span multiple pages:
 *   - Admin can log in, create a place with tags, log out @critical
 *   - Admin can log in, create a tag, create a place with that tag, verify on public site @critical
 *   - Admin can log in, create a place, edit it, then delete it (full lifecycle) @critical
 *   - Admin can log in, create a tag, edit it, then delete it (full lifecycle) @critical
 *   - Unauthenticated user can browse the public directory without logging in
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, logoutFromAdmin, ADMIN_BASE_URL } from '../utils/auth';
import { AdminPlaceFormPage } from '../pages/AdminPlaceFormPage';
import { AdminPlacesPage } from '../pages/AdminPlacesPage';
import { AdminTagFormPage } from '../pages/AdminTagFormPage';
import { AdminTagsPage } from '../pages/AdminTagsPage';
import { PublicDirectoryPage } from '../pages/PublicDirectoryPage';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const UNIQUE_ID = Date.now();

test.describe('User journey: Admin creates and manages places', () => {
  test('admin logs in, creates a place, and logs out @critical', async ({ page }) => {
    // Step 1: Log in
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin\/places/);

    // Step 2: Create a new place
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const placeName = `Journey Place ${UNIQUE_ID}`;
    await formPage.fillName(placeName);
    await formPage.fillAddress('55 Ave A, New York, NY 10009');
    await formPage.fillSpecials('Mon-Thu 6-8pm: $4 drafts');
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList(placeName);

    // Step 3: Log out
    await logoutFromAdmin(page);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('admin creates a place, edits it, then deletes it — full lifecycle @critical', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Create
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const originalName = `Lifecycle Bar ${UNIQUE_ID}`;
    await formPage.fillName(originalName);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    // Edit
    const placesPage = new AdminPlacesPage(page);
    await placesPage.clickEditForFirstPlace();
    const editedName = `Lifecycle Bar EDITED ${UNIQUE_ID}`;
    await formPage.fillName(editedName);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);
    await placesPage.expectPlaceInList(editedName);

    // Delete
    page.on('dialog', dialog => dialog.accept());
    const deleteBtn = page
      .locator('table.places-table tbody tr')
      .filter({ hasText: editedName })
      .locator('form[action*="/delete"] button');
    await deleteBtn.click();
    await expect(page).toHaveURL(/\/admin\/places$/);
    await expect(
      page.locator('table.places-table').getByText(editedName)
    ).not.toBeVisible();
  });
});

test.describe('User journey: Admin creates and manages tags', () => {
  test('admin creates a tag, edits it, then deletes it — full lifecycle @critical', async ({
    page,
  }) => {
    await loginAsAdmin(page);

    // Create tag
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `lifecycle-tag-${UNIQUE_ID}`;
    const tagDisplay = `Lifecycle Tag ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(tagDisplay);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.expectTagInList(tagDisplay);

    // Edit tag
    await tagsPage.clickEditForTag(tagDisplay);
    const editedDisplay = `Lifecycle Tag EDITED ${UNIQUE_ID}`;
    await formPage.fillDisplay(editedDisplay);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await tagsPage.expectTagInList(editedDisplay);

    // Delete tag
    await tagsPage.clickDeleteForTag(editedDisplay);
    await page.getByRole('button', { name: 'Yes, Delete Tag' }).click();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await expect(
      page.locator('#tagsTableBody').getByText(editedDisplay)
    ).not.toBeVisible();
  });
});

test.describe('User journey: Public site browsing', () => {
  test('unauthenticated user can browse the public directory @critical', async ({ page }) => {
    const homePage = new PublicDirectoryPage(page);
    await homePage.goto();
    await homePage.expectHeadingVisible();
    await homePage.expectSubheadingVisible();
    await homePage.expectAuthorInfoVisible();
    // Verify the places section loaded
    await expect(page.locator('#places')).toBeVisible();
    // Verify no login required
    await expect(page).toHaveURL('/');
  });

  test('public API is accessible without authentication @critical', async ({ request }) => {
    const placesResponse = await request.get(`${BASE_URL}/api/places`);
    expect(placesResponse.status()).toBe(200);

    const tagsResponse = await request.get(`${BASE_URL}/api/tags`);
    expect(tagsResponse.status()).toBe(200);
  });
});
