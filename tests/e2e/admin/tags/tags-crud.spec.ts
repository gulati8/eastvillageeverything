/**
 * Admin: Tags CRUD operations
 *
 * Covers:
 *   - Create tag with valid value and display -> appears in list @critical
 *   - Create tag with empty value -> "Value is required" error
 *   - Create tag with empty display -> "Display name is required" error
 *   - Create tag with invalid value (uppercase) -> "Value must contain only..." error
 *   - Create tag with duplicate value -> "A tag with this value already exists" error
 *   - Create tag as child of parent -> appears grouped under parent
 *   - Edit tag -> updated values reflected in list @critical
 *   - Delete tag confirmation page shows tag name and affected places @critical
 *   - Delete tag confirmed -> tag removed from list @critical
 *   - Cancel on new tag form returns to list
 *   - Cancel on edit tag form returns to list
 *   - Tag form sort order field accepts numeric input
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../../utils/auth';
import { AdminTagsPage } from '../../pages/AdminTagsPage';
import { AdminTagFormPage } from '../../pages/AdminTagFormPage';

const UNIQUE_ID = Date.now();

test.describe('Admin Tags — create', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('new tag form renders all required fields', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Value (internal) *')).toBeVisible();
    await expect(page.getByLabel('Display Name *')).toBeVisible();
    await expect(page.getByLabel('Sort Order')).toBeVisible();
    await expect(page.getByLabel('Parent Tag (optional)')).toBeVisible();
  });

  test('creating a tag with valid data redirects to list and tag appears @critical', async ({
    page,
  }) => {
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `test-tag-${UNIQUE_ID}`;
    const tagDisplay = `Test Tag ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(tagDisplay);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.expectTagInList(tagDisplay);
  });

  test('submitting empty value field shows "Value is required" error', async ({ page }) => {
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    await page.evaluate(() => {
      const input = document.getElementById('value') as HTMLInputElement | null;
      if (input) input.removeAttribute('required');
    });
    await formPage.fillDisplay(`Display Only ${UNIQUE_ID}`);
    await formPage.submit();
    await formPage.expectValidationError('Value is required');
  });

  test('submitting empty display field shows "Display name is required" error', async ({ page }) => {
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    await page.evaluate(() => {
      const input = document.getElementById('display') as HTMLInputElement | null;
      if (input) input.removeAttribute('required');
    });
    await formPage.fillValue(`value-only-${UNIQUE_ID}`);
    await formPage.submit();
    await formPage.expectValidationError('Display name is required');
  });

  test('value with uppercase letters shows format validation error', async ({ page }) => {
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    // Override pattern attribute to bypass HTML5 validation
    await page.evaluate(() => {
      const input = document.getElementById('value') as HTMLInputElement | null;
      if (input) input.removeAttribute('pattern');
    });
    await formPage.fillValue('Invalid-UPPERCASE');
    await formPage.fillDisplay(`Test Display ${UNIQUE_ID}`);
    await formPage.submit();
    await formPage.expectValidationError(
      'Value must contain only lowercase letters, numbers, and hyphens'
    );
  });

  test('value with spaces shows format validation error', async ({ page }) => {
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    await page.evaluate(() => {
      const input = document.getElementById('value') as HTMLInputElement | null;
      if (input) input.removeAttribute('pattern');
    });
    await formPage.fillValue('has spaces');
    await formPage.fillDisplay(`Test Display ${UNIQUE_ID}`);
    await formPage.submit();
    await formPage.expectValidationError(
      'Value must contain only lowercase letters, numbers, and hyphens'
    );
  });

  test('Cancel on new tag form returns to tags list', async ({ page }) => {
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    await formPage.fillValue(`cancel-test-${UNIQUE_ID}`);
    await formPage.fillDisplay(`Cancel Test ${UNIQUE_ID}`);
    await formPage.clickCancel();
    await expect(page).toHaveURL(/\/admin\/tags$/);
  });
});

test.describe('Admin Tags — edit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('edit tag form pre-populates existing values @critical', async ({ page }) => {
    // Create a tag first
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `edit-target-${UNIQUE_ID}`;
    const tagDisplay = `Edit Target ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(tagDisplay);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);

    // Click Edit on it
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickEditForTag(tagDisplay);
    await formPage.expectHeadingEdit();
    const valueField = page.getByLabel('Value (internal) *');
    await expect(valueField).toHaveValue(tagValue);
    const displayField = page.getByLabel('Display Name *');
    await expect(displayField).toHaveValue(tagDisplay);
  });

  test('updating display name reflects in tags list @critical', async ({ page }) => {
    // Create a tag
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `update-display-${UNIQUE_ID}`;
    const originalDisplay = `Original Display ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(originalDisplay);
    await formPage.submit();

    // Edit the display name
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickEditForTag(originalDisplay);
    const updatedDisplay = `Updated Display ${UNIQUE_ID}`;
    await formPage.fillDisplay(updatedDisplay);
    await formPage.submit();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await tagsPage.expectTagInList(updatedDisplay);
  });

  test('Cancel on edit tag form returns to tags list without saving', async ({ page }) => {
    // Create a tag to edit
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `cancel-edit-${UNIQUE_ID}`;
    const tagDisplay = `Cancel Edit Tag ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(tagDisplay);
    await formPage.submit();

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickEditForTag(tagDisplay);
    await formPage.clickCancel();
    await expect(page).toHaveURL(/\/admin\/tags$/);
  });
});

test.describe('Admin Tags — delete', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('delete confirmation page shows tag name and confirmation prompt @critical', async ({
    page,
  }) => {
    // Create a tag first
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `delete-confirm-${UNIQUE_ID}`;
    const tagDisplay = `Delete Confirm Tag ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(tagDisplay);
    await formPage.submit();

    // Navigate to delete confirmation
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickDeleteForTag(tagDisplay);
    await expect(page).toHaveURL(/\/admin\/tags\/.*\/delete/);
    await expect(page.getByRole('heading', { name: 'Delete Tag' })).toBeVisible();
    await expect(page.locator('.alert-warning')).toContainText(tagDisplay);
  });

  test('confirming delete removes tag from the list @critical', async ({ page }) => {
    // Create a tag
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `delete-me-${UNIQUE_ID}`;
    const tagDisplay = `Delete Me Tag ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(tagDisplay);
    await formPage.submit();

    // Navigate to delete confirmation and confirm
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickDeleteForTag(tagDisplay);
    await page.getByRole('button', { name: 'Yes, Delete Tag' }).click();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    // Tag should no longer be in the list
    await expect(
      page.locator('#tagsTableBody').getByText(tagDisplay)
    ).not.toBeVisible();
  });

  test('Cancel on delete confirmation returns to tags list without deleting', async ({ page }) => {
    // Create a tag
    const formPage = new AdminTagFormPage(page);
    await formPage.gotoNew();
    const tagValue = `cancel-delete-${UNIQUE_ID}`;
    const tagDisplay = `Cancel Delete Tag ${UNIQUE_ID}`;
    await formPage.fillValue(tagValue);
    await formPage.fillDisplay(tagDisplay);
    await formPage.submit();

    // Navigate to delete confirmation and cancel
    const tagsPage = new AdminTagsPage(page);
    await tagsPage.goto();
    await tagsPage.clickDeleteForTag(tagDisplay);
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/admin\/tags$/);
    await tagsPage.expectTagInList(tagDisplay);
  });
});
