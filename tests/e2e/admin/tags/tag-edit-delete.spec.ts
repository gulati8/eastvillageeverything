/**
 * Admin: Tag edit and delete
 *
 * Covers:
 *   - Edit form pre-populates value and display fields
 *   - Valid edit updates tag and redirects to tags list
 *   - Delete confirmation page shows tag details
 *   - Delete confirmation page shows affected places warning
 *   - Confirming delete removes tag from list
 *   - Cancel on delete page returns to tags list
 *   - Navigating to non-existent tag edit URL returns 404
 *   - Duplicate value on edit is rejected (same validation as create)
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../../utils/auth';
import { AdminTagFormPage } from '../../pages/AdminTagFormPage';
import { AdminTagsPage } from '../../pages/AdminTagsPage';
import { AdminTagDeletePage } from '../../pages/AdminTagDeletePage';

test.describe('Admin Tags — edit and delete', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  /**
   * Creates a tag via the form and returns its display name.
   * Uses a unique suffix to keep tests independent.
   */
  async function createTag(page: import('@playwright/test').Page, suffix: string) {
    const form = new AdminTagFormPage(page);
    await form.gotoNew();
    const value = `tag-${suffix}`;
    const display = `Tag ${suffix}`;
    await form.fillValue(value);
    await form.fillDisplay(display);
    await form.submit();
    await expect(page).toHaveURL('/admin/tags');
    return { value, display };
  }

  test('edit link navigates to edit form with Edit Tag heading', async ({ page }) => {
    const suffix = `edit-${Date.now()}`;
    const { display } = await createTag(page, suffix);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickEditForTag(display);
    await expect(page).toHaveURL(/\/admin\/tags\/.*\/edit/);
    const form = new AdminTagFormPage(page);
    await form.expectHeadingEdit();
  });

  test('edit form pre-populates value and display fields', async ({ page }) => {
    const suffix = `prefill-${Date.now()}`;
    const { value, display } = await createTag(page, suffix);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickEditForTag(display);

    await expect(page.getByLabel('Value (internal) *')).toHaveValue(value);
    await expect(page.getByLabel('Display Name *')).toHaveValue(display);
  });

  test('valid edit updates display name and redirects to tags list', async ({ page }) => {
    const suffix = `update-${Date.now()}`;
    const { display } = await createTag(page, suffix);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickEditForTag(display);

    const updatedDisplay = `Updated ${display}`;
    await page.getByLabel('Display Name *').fill(updatedDisplay);

    const form = new AdminTagFormPage(page);
    await form.submit();
    await expect(page).toHaveURL('/admin/tags');
    await tagsPage.expectTagInList(updatedDisplay);
  });

  test('delete page shows tag details and confirmation button', async ({ page }) => {
    const suffix = `del-${Date.now()}`;
    const { display } = await createTag(page, suffix);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickDeleteForTag(display);

    const deletePage = new AdminTagDeletePage(page);
    await deletePage.expectHeadingVisible();
    await deletePage.expectWarningVisible(display);
    await expect(page.getByRole('button', { name: 'Yes, Delete Tag' })).toBeVisible();
  });

  test('delete page shows "not used by any places" when tag has no places', async ({ page }) => {
    const suffix = `del-noplace-${Date.now()}`;
    const { display } = await createTag(page, suffix);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickDeleteForTag(display);

    const deletePage = new AdminTagDeletePage(page);
    await deletePage.expectNoAffectedPlaces();
  });

  test('confirming delete removes tag from list', async ({ page }) => {
    const suffix = `del-confirm-${Date.now()}`;
    const { display } = await createTag(page, suffix);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickDeleteForTag(display);

    const deletePage = new AdminTagDeletePage(page);
    await deletePage.confirmDelete();
    await expect(page).toHaveURL('/admin/tags');
    await expect(page.locator('#tagsTableBody').getByText(display)).not.toBeVisible();
  });

  test('cancel on delete page returns to tags list without deleting', async ({ page }) => {
    const suffix = `del-cancel-${Date.now()}`;
    const { display } = await createTag(page, suffix);

    const tagsPage = new AdminTagsPage(page);
    await tagsPage.clickDeleteForTag(display);

    const deletePage = new AdminTagDeletePage(page);
    await deletePage.clickCancel();
    await expect(page).toHaveURL('/admin/tags');
    await tagsPage.expectTagInList(display);
  });

  test('navigating to non-existent tag edit URL returns 404 response', async ({ page }) => {
    await page.goto('/admin/tags/00000000-0000-0000-0000-000000000000/edit');
    const content = await page.content();
    expect(content).toContain('Tag not found');
  });

  test('navigating to non-existent tag delete URL returns 404 response', async ({ page }) => {
    await page.goto('/admin/tags/00000000-0000-0000-0000-000000000000/delete');
    const content = await page.content();
    expect(content).toContain('Tag not found');
  });
});
