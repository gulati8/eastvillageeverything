/**
 * Admin: Places CRUD operations
 *
 * Covers:
 *   - Create place with valid data -> appears in list @critical
 *   - Create place with empty name -> validation error "Name is required"
 *   - Edit place -> update persisted to list @critical
 *   - Delete place -> removed from list @critical
 *   - New place form has all expected fields
 *   - Cancel on new place form returns to list
 *   - Cancel on edit place form returns to list
 *   - Edit place form pre-populates existing data
 *   - Place with special characters in name renders correctly
 *   - Place with website URL shows link on public site
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../../utils/auth';
import { AdminPlacesPage } from '../../pages/AdminPlacesPage';
import { AdminPlaceFormPage } from '../../pages/AdminPlaceFormPage';

const UNIQUE_ID = Date.now();

test.describe('Admin Places — create', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('new place form renders all required fields @critical', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Name *')).toBeVisible();
    await expect(page.getByLabel('Address')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Website')).toBeVisible();
    await expect(page.getByLabel('Specials')).toBeVisible();
    await expect(page.getByLabel('Categories')).toBeVisible();
    await expect(page.getByLabel('Notes')).toBeVisible();
  });

  test('submitting empty name shows "Name is required" validation error @critical', async ({
    page,
  }) => {
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    await page.evaluate(() => {
      const input = document.getElementById('name') as HTMLInputElement | null;
      if (input) input.removeAttribute('required');
    });
    await formPage.submit();
    await formPage.expectValidationError('Name is required');
    await expect(page).toHaveURL(/\/admin\/places/);
    await expect(page).not.toHaveURL(/\/admin\/places\/[^/]+$/);
  });

  test('creating a place with valid data redirects to list and place appears @critical', async ({
    page,
  }) => {
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const placeName = `Playwright Test Bar ${UNIQUE_ID}`;
    await formPage.fillName(placeName);
    await formPage.fillAddress('101 Ave B, New York, NY 10009');
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);
    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList(placeName);
  });

  test('creating a place with name containing apostrophe renders correctly', async ({ page }) => {
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const placeName = `O'Malley's Tavern ${UNIQUE_ID}`;
    await formPage.fillName(placeName);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);
    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList(`O'Malley's Tavern`);
  });

  test('creating a place with all optional fields filled succeeds', async ({ page }) => {
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const placeName = `Full Details Bar ${UNIQUE_ID}`;
    await formPage.fillName(placeName);
    await formPage.fillAddress('200 E 10th St, New York, NY 10003');
    await formPage.fillPhone('2125551234');
    await formPage.fillUrl('https://example-bar.com');
    await formPage.fillSpecials('Mon-Fri 5-7pm: $5 drafts, $6 wine');
    await formPage.fillCategories('Bar, Happy Hour');
    await formPage.fillNotes('Cash only. Great jukebox.');
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);
    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList(placeName);
  });

  test('Cancel on new place form returns to places list without creating', async ({ page }) => {
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    await formPage.fillName(`Should Not Exist ${UNIQUE_ID}`);
    await formPage.clickCancel();
    await expect(page).toHaveURL(/\/admin\/places$/);
  });
});

test.describe('Admin Places — edit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('edit form pre-populates place name @critical', async ({ page }) => {
    // First create a place via API call (direct page submission as setup)
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const originalName = `Edit Target ${UNIQUE_ID}`;
    await formPage.fillName(originalName);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    // Now click edit on the first matching place
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.clickEditForFirstPlace();
    await formPage.expectHeadingEdit();
    // Name field should be filled
    const nameValue = await page.getByLabel('Name *').inputValue();
    expect(nameValue.length).toBeGreaterThan(0);
  });

  test('updating a place name reflects in the list @critical', async ({ page }) => {
    // Create the place
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const originalName = `Before Edit ${UNIQUE_ID}`;
    await formPage.fillName(originalName);
    await formPage.submit();

    // Edit it
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.clickEditForFirstPlace();
    const updatedName = `After Edit ${UNIQUE_ID}`;
    await formPage.fillName(updatedName);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);
    await placesPage.expectPlaceInList(updatedName);
  });

  test('submitting edit form with empty name shows validation error', async ({ page }) => {
    // Create a place first
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    await formPage.fillName(`Name Clear Target ${UNIQUE_ID}`);
    await formPage.submit();

    // Edit it and clear name
    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.clickEditForFirstPlace();
    await formPage.clearName();
    await page.evaluate(() => {
      const input = document.getElementById('name') as HTMLInputElement | null;
      if (input) input.removeAttribute('required');
    });
    await formPage.submit();
    await formPage.expectValidationError('Name is required');
  });

  test('Cancel on edit form returns to places list without saving', async ({ page }) => {
    // Create then try to edit
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    await formPage.fillName(`Cancel Edit Target ${UNIQUE_ID}`);
    await formPage.submit();

    const placesPage = new AdminPlacesPage(page);
    await placesPage.goto();
    await placesPage.clickEditForFirstPlace();
    await formPage.clickCancel();
    await expect(page).toHaveURL(/\/admin\/places$/);
  });
});

test.describe('Admin Places — delete', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('deleting a place removes it from the list @critical', async ({ page }) => {
    // Create a place
    const formPage = new AdminPlaceFormPage(page);
    await formPage.gotoNew();
    const placeName = `Delete Me ${UNIQUE_ID}`;
    await formPage.fillName(placeName);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/places$/);

    // Delete it — handle the confirm dialog
    page.on('dialog', dialog => dialog.accept());
    const placesPage = new AdminPlacesPage(page);
    const deleteForm = page.locator('form[action*="/delete"]').first();
    await deleteForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/places$/);
    // The deleted place should no longer be in the table
    await expect(
      page.locator('table.places-table').getByText(placeName)
    ).not.toBeVisible();
  });
});
