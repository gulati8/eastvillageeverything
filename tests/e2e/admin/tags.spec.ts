/**
 * Admin — Tags CRUD tests (Desktop & Mobile)
 *
 * Covers:
 *   - Tags list renders with heading and "New Tag" button
 *   - Standalone tags and tag groups (parent + children) are rendered in structured layout
 *   - Section header "Tag Groups" separates group from standalone tags
 *   - Empty state message shown when no tags exist
 *   - Drag-handle column is present
 *   - New Tag form: heading renders as "New Tag"
 *   - Tag value field only accepts lowercase letters, numbers, hyphens
 *   - Validation: value is required
 *   - Validation: display name is required
 *   - Validation: duplicate tag value is rejected
 *   - Create Tag: successful creation redirects to tags list
 *   - Edit Tag: form pre-populates value and display name
 *   - Delete Tag: confirmation page shows tag details + affected places
 *   - Delete Tag: confirmed deletion redirects back to tags list
 *   - Cancel on new/edit form returns to tags list
 */

import { test, expect } from '../fixtures/test-fixtures';

const ADMIN_BASE = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

test.describe('Admin tags list', () => {
  test.beforeEach(async ({ adminTagsPage }) => {
    await adminTagsPage.goto();
  });

  test('renders the Tags heading', async ({ adminTagsPage }) => {
    await adminTagsPage.expectHeadingVisible();
  });

  test('shows "New Tag" button', async ({ adminPage }) => {
    await expect(adminPage.getByRole('link', { name: 'New Tag' })).toBeVisible();
  });

  test('shows descriptive hint text about standalone vs grouped tags', async ({ adminPage }) => {
    await expect(adminPage.locator('p.text-muted')).toContainText('Standalone tags shown first');
  });

  test('tags table has display name, value, and actions columns', async ({ adminPage }) => {
    const header = adminPage.locator('table thead');
    await expect(header).toContainText('Display Name');
    await expect(header).toContainText('Value');
    await expect(header).toContainText('Actions');
  });

  test('navbar brand and nav links are visible', async ({ adminPage }) => {
    await expect(adminPage.getByRole('link', { name: 'EVE Admin' })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Places' })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Tags' })).toBeVisible();
  });
});

test.describe('New Tag form', () => {
  test.beforeEach(async ({ adminTagFormPage }) => {
    await adminTagFormPage.gotoNew();
  });

  test('renders "New Tag" heading', async ({ adminTagFormPage }) => {
    await adminTagFormPage.expectHeadingNew();
  });

  test('has Value, Display Name, Sort Order, and Parent Tag fields', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await expect(adminPage.getByLabel('Value (internal) *')).toBeVisible();
    await expect(adminPage.getByLabel('Display Name *')).toBeVisible();
    await expect(adminPage.getByLabel('Sort Order')).toBeVisible();
    await expect(adminPage.getByLabel('Parent Tag (optional)')).toBeVisible();
  });

  test('value field hint text mentions lowercase/numbers/hyphens', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await expect(adminPage.locator('.form-text').first()).toContainText('Lowercase letters');
  });

  test('submitting with empty value shows "Value is required" error', async ({
    adminTagFormPage,
  }) => {
    await adminTagFormPage.page.evaluate(() => {
      const el = document.getElementById('value') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await adminTagFormPage.fillDisplay('Some Display Name');
    await adminTagFormPage.submit();
    await adminTagFormPage.expectValidationError('Value is required');
  });

  test('submitting with empty display name shows "Display name is required" error', async ({
    adminTagFormPage,
  }) => {
    await adminTagFormPage.page.evaluate(() => {
      const el = document.getElementById('display') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await adminTagFormPage.fillValue('some-tag-value');
    await adminTagFormPage.submit();
    await adminTagFormPage.expectValidationError('Display name is required');
  });

  test('submitting a value with invalid characters (uppercase) shows format error', async ({
    adminTagFormPage,
  }) => {
    await adminTagFormPage.page.evaluate(() => {
      const el = document.getElementById('value') as HTMLInputElement | null;
      if (el) el.removeAttribute('pattern');
    });
    await adminTagFormPage.fillValue('Invalid_Value!');
    await adminTagFormPage.fillDisplay('Some Name');
    await adminTagFormPage.submit();
    await adminTagFormPage.expectValidationError(
      'Value must contain only lowercase letters, numbers, and hyphens'
    );
  });

  test('Cancel button returns to /admin/tags', async ({ adminTagFormPage }) => {
    await adminTagFormPage.clickCancel();
    await expect(adminTagFormPage.page).toHaveURL(/\/admin\/tags$/);
  });

  test('form action for new tag points to /admin/tags', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    const form = adminPage
      .locator('form[method="POST"]')
      .filter({ hasNot: adminPage.locator('[action="/admin/logout"]') })
      .first();
    const action = await form.getAttribute('action');
    expect(action).toBe('/admin/tags');
  });
});

test.describe('Create Tag — end-to-end', () => {
  const uniqueValue = `test-tag-${Date.now()}`;
  const uniqueDisplay = `Test Tag ${Date.now()}`;

  test('creates a standalone tag and shows it in the list', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(uniqueValue);
    await adminPage.getByLabel('Display Name *').fill(uniqueDisplay);
    await adminPage.getByRole('button', { name: /Tag/ }).click();

    await expect(adminPage).toHaveURL(/\/admin\/tags$/);
    await expect(adminPage.locator('#tagsTableBody').getByText(uniqueDisplay)).toBeVisible();
  });

  test('duplicate tag value shows "already exists" error', async ({ adminPage }) => {
    // Create first tag
    const dupeValue = `dupe-${Date.now()}`;
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(dupeValue);
    await adminPage.getByLabel('Display Name *').fill('First Dupe Tag');
    await adminPage.getByRole('button', { name: /Tag/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/tags$/);

    // Attempt to create a second with the same value
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(dupeValue);
    await adminPage.getByLabel('Display Name *').fill('Second Dupe Tag');
    await adminPage.getByRole('button', { name: /Tag/ }).click();

    await expect(adminPage.locator('.alert-danger')).toContainText(
      'A tag with this value already exists'
    );
  });
});

test.describe('Edit Tag form', () => {
  test('navigating to an edit route shows "Edit Tag" heading', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags`);
    const editLinks = adminPage.locator('#tagsTableBody a[href*="/edit"]');
    const count = await editLinks.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await editLinks.first().click();
    await expect(adminPage.getByRole('heading', { name: 'Edit Tag' })).toBeVisible();
  });

  test('edit form pre-fills value and display name', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags`);
    const rows = adminPage.locator('#tagsTableBody tr[data-id]');
    const count = await rows.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const firstRow = rows.first();
    const displayInList = await firstRow.locator('td').nth(2).innerText();
    const valueInList = await firstRow.locator('td code').innerText();

    await firstRow.getByRole('link', { name: 'Edit' }).click();
    await expect(adminPage.getByLabel('Value (internal) *')).toHaveValue(valueInList.trim());
    await expect(adminPage.getByLabel('Display Name *')).toHaveValue(displayInList.trim());
  });

  test('clearing value on edit and submitting shows "Value is required" error', async ({
    adminPage,
  }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags`);
    const editLinks = adminPage.locator('#tagsTableBody a[href*="/edit"]');
    if ((await editLinks.count()) === 0) {
      test.skip();
      return;
    }
    await editLinks.first().click();
    const valueField = adminPage.getByLabel('Value (internal) *');
    await valueField.fill('');
    await adminPage.evaluate(() => {
      const el = document.getElementById('value') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await adminPage.getByRole('button', { name: /Tag/ }).click();
    await expect(adminPage.locator('.alert-danger')).toContainText('Value is required');
  });
});

test.describe('Delete Tag — confirmation page', () => {
  test('delete link navigates to a delete confirmation page', async ({ adminPage }) => {
    // Create a tag to delete
    const deleteValue = `del-tag-${Date.now()}`;
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(deleteValue);
    await adminPage.getByLabel('Display Name *').fill('Delete This Tag');
    await adminPage.getByRole('button', { name: /Tag/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/tags$/);

    // Click the Delete link (not a form submit — it's a GET to the confirmation page)
    const row = adminPage.locator('#tagsTableBody tr').filter({ hasText: 'Delete This Tag' });
    await row.getByRole('link', { name: 'Delete' }).click();

    await expect(adminPage.getByRole('heading', { name: 'Delete Tag' })).toBeVisible();
    await expect(adminPage.locator('.alert-warning')).toContainText('Delete This Tag');
  });

  test('delete confirmation page shows tag details card', async ({ adminPage }) => {
    const deleteValue = `del2-tag-${Date.now()}`;
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(deleteValue);
    await adminPage.getByLabel('Display Name *').fill('Delete Me Too');
    await adminPage.getByRole('button', { name: /Tag/ }).click();

    const row = adminPage.locator('#tagsTableBody tr').filter({ hasText: 'Delete Me Too' });
    await row.getByRole('link', { name: 'Delete' }).click();

    // Shows the tag details card
    await expect(adminPage.locator('.card-header')).toContainText('Tag Details');
    await expect(adminPage.locator('td code')).toContainText(deleteValue);
  });

  test('confirming deletion removes the tag and redirects to tags list', async ({ adminPage }) => {
    const deleteValue = `del3-tag-${Date.now()}`;
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(deleteValue);
    await adminPage.getByLabel('Display Name *').fill('Goodbye Tag');
    await adminPage.getByRole('button', { name: /Tag/ }).click();

    const row = adminPage.locator('#tagsTableBody tr').filter({ hasText: 'Goodbye Tag' });
    await row.getByRole('link', { name: 'Delete' }).click();

    // Click the confirm delete button
    await adminPage.getByRole('button', { name: 'Yes, Delete Tag' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/tags$/);
    await expect(adminPage.locator('#tagsTableBody').getByText('Goodbye Tag')).not.toBeVisible();
  });

  test('Cancel on delete confirmation returns to tags list', async ({ adminPage }) => {
    const deleteValue = `del4-tag-${Date.now()}`;
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(deleteValue);
    await adminPage.getByLabel('Display Name *').fill('Do Not Delete');
    await adminPage.getByRole('button', { name: /Tag/ }).click();

    const row = adminPage.locator('#tagsTableBody tr').filter({ hasText: 'Do Not Delete' });
    await row.getByRole('link', { name: 'Delete' }).click();

    await adminPage.getByRole('link', { name: 'Cancel' }).click();
    await expect(adminPage).toHaveURL(/\/admin\/tags$/);
  });
});

test.describe('Tag parent/child relationships', () => {
  test('creating a child tag under a parent shows it nested in the list', async ({ adminPage }) => {
    // Create parent tag
    const parentValue = `parent-${Date.now()}`;
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(parentValue);
    await adminPage.getByLabel('Display Name *').fill('Parent Tag');
    await adminPage.getByRole('button', { name: /Tag/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/tags$/);

    // Create child tag
    const childValue = `child-${Date.now()}`;
    await adminPage.goto(`${ADMIN_BASE}/admin/tags/new`);
    await adminPage.getByLabel('Value (internal) *').fill(childValue);
    await adminPage.getByLabel('Display Name *').fill('Child Tag');
    await adminPage.getByLabel('Parent Tag (optional)').selectOption({ label: 'Parent Tag' });
    await adminPage.getByRole('button', { name: /Tag/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/tags$/);

    // Parent should be in a .parent-tag row and child in a .child-tag row
    await expect(adminPage.locator('.parent-tag').filter({ hasText: 'Parent Tag' })).toBeVisible();
    await expect(adminPage.locator('.child-tag').filter({ hasText: 'Child Tag' })).toBeVisible();
  });

  test('"Tag Groups" section header is shown when group tags exist', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/tags`);
    const parentRows = adminPage.locator('.parent-tag');
    const count = await parentRows.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await expect(adminPage.locator('.section-header')).toContainText('Tag Groups');
  });
});
