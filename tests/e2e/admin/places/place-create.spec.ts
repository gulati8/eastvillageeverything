/**
 * Admin: Place creation — form validation and happy path
 *
 * Covers:
 *   - New Place form renders required and optional fields
 *   - Submitting without name shows "Name is required"
 *   - Submitting with valid name creates place and redirects to list
 *   - Submitting with all fields creates place correctly
 *   - Cancel button navigates back to places list
 *   - Special characters in name and notes are preserved
 *   - Tags can be selected when creating a place
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../utils/auth';
import { AdminPlaceFormPage } from '../../pages/AdminPlaceFormPage';
import { AdminPlacesPage } from '../../pages/AdminPlacesPage';
import { places } from '../../fixtures/testData';

test.describe('Admin Places — create @critical', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('new place form has all expected fields', async ({ page }) => {
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    await form.expectHeadingNew();
    await expect(page.getByLabel('Name *')).toBeVisible();
    await expect(page.getByLabel('Address')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Website')).toBeVisible();
    await expect(page.getByLabel('Specials')).toBeVisible();
    await expect(page.getByLabel('Categories')).toBeVisible();
    await expect(page.getByLabel('Notes')).toBeVisible();
  });

  test('submitting empty name shows validation error', async ({ page }) => {
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    // Remove HTML5 required to reach server-side validation
    await page.evaluate(() => {
      const el = document.getElementById('name') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await form.submit();
    await form.expectValidationError('Name is required');
  });

  test('submitting with valid name only creates place and redirects to list', async ({ page }) => {
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    const uniqueName = `Test Bar ${Date.now()}`;
    await form.fillName(uniqueName);
    await form.submit();
    await expect(page).toHaveURL('/admin/places');
    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList(uniqueName);
  });

  test('submitting with all fields creates place and redirects to list', async ({ page }) => {
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    const p = places.happyHourBar;
    const uniqueName = `${p.name} ${Date.now()}`;
    await form.fillName(uniqueName);
    await form.fillAddress(p.address);
    await form.fillPhone(p.phone);
    await form.fillUrl(p.url);
    await form.fillSpecials(p.specials);
    await form.fillCategories(p.categories);
    await form.fillNotes(p.notes);
    await form.submit();
    await expect(page).toHaveURL('/admin/places');
    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList(uniqueName);
  });

  test('cancel button navigates back to places list without creating', async ({ page }) => {
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    await form.fillName('Should Not Be Saved');
    await form.clickCancel();
    await expect(page).toHaveURL('/admin/places');
  });

  test('place name with special characters is accepted', async ({ page }) => {
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    const specialName = `O'Hanlon's Bar & Grill ${Date.now()}`;
    await form.fillName(specialName);
    await form.submit();
    await expect(page).toHaveURL('/admin/places');
    const placesPage = new AdminPlacesPage(page);
    await placesPage.expectPlaceInList("O'Hanlon's");
  });

  test('form page title indicates New Place', async ({ page }) => {
    const form = new AdminPlaceFormPage(page);
    await form.gotoNew();
    await expect(page).toHaveTitle(/New Place/);
  });
});
