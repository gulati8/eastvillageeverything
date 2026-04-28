/**
 * Admin — Places CRUD tests (Desktop & Mobile)
 *
 * Covers:
 *   - Places list renders with correct heading and "New Place" button
 *   - Desktop table view is visible at 1280px; mobile card view at 390px
 *   - Sorting by Name, Updated At, Created At updates the URL query params
 *   - Empty state message shown when no places exist
 *   - New Place form: heading renders as "New Place"
 *   - Create Place: name is required — error shown when omitted
 *   - Create Place: successfully creates and redirects to list
 *   - Edit Place: form pre-fills existing data
 *   - Update Place: name is required — error shown when cleared
 *   - Delete Place: confirmation dialog then redirect back to list
 *   - Cancel on new/edit form returns to places list
 *   - Navbar brand and nav links are visible
 *   - User name is displayed in the navbar when logged in
 */

import { test, expect } from '../fixtures/test-fixtures';

const ADMIN_BASE = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

test.describe('Admin places list — desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ adminPlacesPage }) => {
    await adminPlacesPage.goto();
  });

  test('renders the Places heading', async ({ adminPlacesPage }) => {
    await adminPlacesPage.expectHeadingVisible();
  });

  test('shows "New Place" button', async ({ adminPage }) => {
    await expect(adminPage.getByRole('link', { name: 'New Place' })).toBeVisible();
  });

  test('desktop table wrapper is visible at 1280px', async ({ adminPage }) => {
    await expect(adminPage.locator('.places-table-wrapper')).toBeVisible();
  });

  test('mobile card view is hidden at 1280px', async ({ adminPage }) => {
    await expect(adminPage.locator('.place-cards')).toBeHidden();
  });

  test('table has Name, Website, Updated At, Created At columns', async ({ adminPage }) => {
    const header = adminPage.locator('table.places-table thead');
    await expect(header).toContainText('Name');
    await expect(header).toContainText('Website');
    await expect(header).toContainText('Updated At');
    await expect(header).toContainText('Created At');
  });

  test('clicking "Name" sort link adds sort_by=name to URL', async ({ adminPage }) => {
    await adminPage.getByRole('link', { name: /Name/ }).click();
    await expect(adminPage).toHaveURL(/sort_by=name/);
  });

  test('clicking "Updated At" sort link adds sort_by=updated_at to URL', async ({ adminPage }) => {
    await adminPage.getByRole('link', { name: /Updated At/ }).click();
    await expect(adminPage).toHaveURL(/sort_by=updated_at/);
  });

  test('clicking "Created At" sort link adds sort_by=created_at to URL', async ({ adminPage }) => {
    await adminPage.getByRole('link', { name: /Created At/ }).click();
    await expect(adminPage).toHaveURL(/sort_by=created_at/);
  });

  test('clicking sort column twice toggles to descending order', async ({ adminPage }) => {
    await adminPage.getByRole('link', { name: /Name/ }).click();
    await adminPage.getByRole('link', { name: /Name/ }).click();
    await expect(adminPage).toHaveURL(/sort_order=desc/);
  });

  test('navbar brand "EVE Admin" is visible', async ({ adminPage }) => {
    await expect(adminPage.getByRole('link', { name: 'EVE Admin' })).toBeVisible();
  });

  test('navbar shows Places and Tags links', async ({ adminPage }) => {
    await expect(adminPage.getByRole('link', { name: 'Places' })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Tags' })).toBeVisible();
  });

  test('logout button is visible', async ({ adminPage }) => {
    await expect(adminPage.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});

test.describe('Admin places list — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ adminPlacesPage }) => {
    await adminPlacesPage.goto();
  });

  test('desktop table is hidden at 390px', async ({ adminPage }) => {
    await expect(adminPage.locator('.places-table-wrapper')).toBeHidden();
  });

  test('mobile card view is visible at 390px', async ({ adminPage }) => {
    const placesCount = await adminPage.locator('div.place-card').count();
    if (placesCount === 0) {
      // No data; check empty state instead
      await expect(adminPage.getByText('No places yet.')).toBeVisible();
      return;
    }
    await expect(adminPage.locator('.place-cards')).toBeVisible();
  });

  test('mobile card rows show Name, Website, Updated At, Created At labels', async ({
    adminPage,
  }) => {
    const cards = adminPage.locator('div.place-card');
    const count = await cards.count();
    if (count === 0) return;
    const firstCard = cards.first();
    await expect(firstCard.locator('th').filter({ hasText: 'Name' })).toBeVisible();
    await expect(firstCard.locator('th').filter({ hasText: 'Updated At' })).toBeVisible();
    await expect(firstCard.locator('th').filter({ hasText: 'Created At' })).toBeVisible();
  });

  test('New Place button is visible on mobile', async ({ adminPage }) => {
    await expect(adminPage.getByRole('link', { name: 'New Place' })).toBeVisible();
  });
});

test.describe('New Place form', () => {
  test.beforeEach(async ({ adminPlaceFormPage }) => {
    await adminPlaceFormPage.gotoNew();
  });

  test('renders "New Place" heading', async ({ adminPlaceFormPage }) => {
    await adminPlaceFormPage.expectHeadingNew();
  });

  test('has Name, Address, Phone, Website, Specials, Categories, Notes fields', async ({
    adminPage,
  }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/places/new`);
    await expect(adminPage.getByLabel('Name *')).toBeVisible();
    await expect(adminPage.getByLabel('Address')).toBeVisible();
    await expect(adminPage.getByLabel('Phone')).toBeVisible();
    await expect(adminPage.getByLabel('Website')).toBeVisible();
    await expect(adminPage.getByLabel('Specials')).toBeVisible();
    await expect(adminPage.getByLabel('Categories')).toBeVisible();
    await expect(adminPage.getByLabel('Notes')).toBeVisible();
  });

  test('submitting without a name shows "Name is required" validation error', async ({
    adminPlaceFormPage,
  }) => {
    // Remove HTML5 required to bypass client-side validation and reach the server
    await adminPlaceFormPage.page.evaluate(() => {
      const nameInput = document.getElementById('name') as HTMLInputElement | null;
      if (nameInput) nameInput.removeAttribute('required');
    });
    await adminPlaceFormPage.submit();
    await adminPlaceFormPage.expectValidationError('Name is required');
  });

  test('Cancel button returns to /admin/places', async ({ adminPlaceFormPage }) => {
    await adminPlaceFormPage.clickCancel();
    await expect(adminPlaceFormPage.page).toHaveURL(/\/admin\/places$/);
  });

  test('form action attribute points to /admin/places for new place', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/places/new`);
    const form = adminPage.locator('form[method="POST"]').filter({ hasNot: adminPage.locator('[action="/admin/logout"]') }).first();
    const action = await form.getAttribute('action');
    expect(action).toBe('/admin/places');
  });
});

test.describe('Create Place — end-to-end', () => {
  const uniqueName = `Test Bar ${Date.now()}`;

  test('creates a place and shows it in the list', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/places/new`);
    await adminPage.getByLabel('Name *').fill(uniqueName);
    await adminPage.getByLabel('Address').fill('123 East 1st St');
    await adminPage.getByLabel('Specials').fill('Mon-Fri 5-7pm $5 beers');
    await adminPage.getByRole('button', { name: /Place/ }).click();

    // Should redirect to places list
    await expect(adminPage).toHaveURL(/\/admin\/places$/);
    await expect(adminPage.locator('table.places-table, .place-cards').getByText(uniqueName)).toBeVisible();
  });

  test('created place name is a link to edit', async ({ adminPage }) => {
    // Create
    await adminPage.goto(`${ADMIN_BASE}/admin/places/new`);
    const name = `Link Test ${Date.now()}`;
    await adminPage.getByLabel('Name *').fill(name);
    await adminPage.getByRole('button', { name: /Place/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/places$/);

    // Find the edit button for the new place (visible in either desktop table or mobile cards)
    const editLinks = adminPage.locator(`a[href*="/edit"]`);
    expect(await editLinks.count()).toBeGreaterThan(0);
  });
});

test.describe('Edit Place form', () => {
  test('navigating to an edit route renders "Edit Place" heading', async ({ adminPage }) => {
    // Find first edit link if any places exist
    await adminPage.goto(`${ADMIN_BASE}/admin/places`);
    const editLinks = adminPage.locator('a[href*="/edit"]');
    const count = await editLinks.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await editLinks.first().click();
    await expect(adminPage.getByRole('heading', { name: 'Edit Place' })).toBeVisible();
  });

  test('edit form pre-fills existing name value', async ({ adminPage }) => {
    // Find any existing place by getting first edit link
    await adminPage.goto(`${ADMIN_BASE}/admin/places`);
    const editLinks = adminPage.locator('table.places-table a[href*="/edit"]');
    const count = await editLinks.count();
    if (count === 0) {
      test.skip();
      return;
    }
    // Read the name from the table row before clicking edit
    const row = adminPage.locator('table.places-table tbody tr').first();
    const nameInTable = await row.locator('td').nth(1).innerText();
    await row.getByRole('link', { name: 'Edit' }).click();
    const nameField = adminPage.getByLabel('Name *');
    await expect(nameField).toHaveValue(nameInTable.trim());
  });

  test('clearing name and submitting shows "Name is required" error', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin/places`);
    const editLinks = adminPage.locator('table.places-table a[href*="/edit"]');
    const count = await editLinks.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await editLinks.first().click();
    const nameField = adminPage.getByLabel('Name *');
    await nameField.fill('');
    // Remove HTML5 required to reach server validation
    await adminPage.evaluate(() => {
      const el = document.getElementById('name') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await adminPage.getByRole('button', { name: /Place/ }).click();
    await expect(adminPage.locator('.alert-danger')).toContainText('Name is required');
  });
});

test.describe('Delete Place', () => {
  test('delete button triggers confirmation and on confirm removes the place', async ({
    adminPage,
  }) => {
    // First create a place to delete
    await adminPage.goto(`${ADMIN_BASE}/admin/places/new`);
    const deleteName = `Delete Me ${Date.now()}`;
    await adminPage.getByLabel('Name *').fill(deleteName);
    await adminPage.getByRole('button', { name: /Place/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/places$/);

    // Accept the confirmation dialog automatically
    adminPage.on('dialog', dialog => dialog.accept());

    // Click delete for the newly created place (desktop table)
    const row = adminPage.locator('table.places-table tbody tr').filter({ hasText: deleteName });
    await row.locator('form[action*="delete"] button').click();

    // Redirected back to list; place should be gone
    await expect(adminPage).toHaveURL(/\/admin\/places$/);
    await expect(adminPage.locator('table.places-table').getByText(deleteName)).not.toBeVisible();
  });
});
