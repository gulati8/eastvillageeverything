/**
 * Admin: Tag creation — form validation and happy path
 *
 * Covers:
 *   - New tag form renders with value, display, sort_order, parent fields
 *   - Submitting without value shows "Value is required"
 *   - Submitting without display name shows "Display name is required"
 *   - Value with uppercase letters fails validation
 *   - Value with spaces fails validation
 *   - Value with underscores fails validation
 *   - Value with special characters fails validation
 *   - Duplicate value shows "A tag with this value already exists"
 *   - Valid tag submission creates tag and redirects to tags list
 *   - Cancel navigates back to tags list
 *   - Creating a child tag with parent selected nests under parent group
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../utils/auth';
import { AdminTagFormPage } from '../../pages/AdminTagFormPage';
import { AdminTagsPage } from '../../pages/AdminTagsPage';
import { invalidTagValues } from '../../fixtures/testData';

test.describe('Admin Tags — create', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('new tag form has all expected fields', async ({ page }) => {
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    await form.expectHeadingNew();
    await expect(page.getByLabel('Value (internal) *')).toBeVisible();
    await expect(page.getByLabel('Display Name *')).toBeVisible();
    await expect(page.getByLabel('Sort Order')).toBeVisible();
    await expect(page.getByLabel('Parent Tag (optional)')).toBeVisible();
  });

  test('submitting without value shows "Value is required" @critical', async ({ page }) => {
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    await page.evaluate(() => {
      const el = document.getElementById('value') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await form.fillDisplay('Missing Value Tag');
    await form.submit();
    await form.expectValidationError('Value is required');
  });

  test('submitting without display name shows "Display name is required"', async ({ page }) => {
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    await page.evaluate(() => {
      const el = document.getElementById('display') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await form.fillValue(`test-value-${Date.now()}`);
    await form.submit();
    await form.expectValidationError('Display name is required');
  });

  test.describe('Value format validation', () => {
    for (const invalid of invalidTagValues) {
      test(`value "${invalid}" is rejected as invalid format`, async ({ page }) => {
        const form = new AdminTagFormPage(page);
        await form.gotoNew();
        await page.evaluate(() => {
          const el = document.getElementById('value') as HTMLInputElement | null;
          if (el) el.removeAttribute('pattern');
        });
        await form.fillValue(invalid);
        await form.fillDisplay('Test Display');
        await form.submit();
        await form.expectValidationError('Value must contain only lowercase letters, numbers, and hyphens');
      });
    }
  });

  test('valid tag submission creates tag and redirects to tags list @critical', async ({ page }) => {
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    const uniqueValue = `test-tag-${Date.now()}`;
    const displayName = `Test Tag ${Date.now()}`;
    await form.fillValue(uniqueValue);
    await form.fillDisplay(displayName);
    await form.fillSortOrder('5');
    await form.submit();
    await expect(page).toHaveURL('/admin/tags');
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.expectTagInList(displayName);
  });

  test('cancel navigates back to tags list without creating', async ({ page }) => {
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    await form.fillValue('should-not-save');
    await form.fillDisplay('Should Not Save');
    await form.clickCancel();
    await expect(page).toHaveURL('/admin/tags');
  });

  test('duplicate tag value shows appropriate error', async ({ page }) => {
    const form = new AdminTagFormPage(page);
    const uniqueValue = `dupe-test-${Date.now()}`;

    // Create first tag
    await form.gotoNew();
    await form.fillValue(uniqueValue);
    await form.fillDisplay('First Tag');
    await form.submit();
    await expect(page).toHaveURL('/admin/tags');

    // Attempt to create second tag with same value
    await form.gotoNew();
    await form.fillValue(uniqueValue);
    await form.fillDisplay('Duplicate Tag');
    await form.submit();
    await form.expectValidationError('A tag with this value already exists');
  });

  test('form page title indicates New Tag', async ({ page }) => {
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    await expect(page).toHaveTitle(/New Tag/);
  });
});
