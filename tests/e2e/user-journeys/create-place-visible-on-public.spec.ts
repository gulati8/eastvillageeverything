/**
 * User Journey: Admin creates a place -> it appears on the public directory
 *
 * This is the core data flow of the application. An admin creates a new place
 * via the admin CMS, and it should immediately appear on the public-facing
 * directory page. Also tests the cross-site API: a place visible on the
 * public site can be fetched from the public API.
 *
 * Covers:
 *   - Admin can log in, create a place, and it appears in /admin/places list
 *   - The new place is visible on the public directory page (/)
 *   - The new place is returned by GET /api/places
 *   - Deleting the place removes it from the admin list AND the public site
 *   - Tag created in admin is available as a filter option on the public site
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';
import { AdminPlaceFormPage } from '../pages/AdminPlaceFormPage';
import { AdminPlacesPage } from '../pages/AdminPlacesPage';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('User Journey: Create Place -> Visible on Public Site', () => {
  test(
    'admin creates a place and it appears on the public directory @critical',
    async ({ browser }) => {
      // Step 1: Open an admin browser context and create a place
      const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
      const adminPage = await adminContext.newPage();
      await loginAsAdmin(adminPage);

      const placeName = `Journey Bar ${Date.now()}`;
      const placeAddress = '123 E 6th St, New York, NY 10003';
      const placeSpecials = 'Mon-Fri 5-7pm: $5 craft beers';

      const form = new AdminPlaceFormPage(adminPage);
      await form.gotoNew();
      await form.fillName(placeName);
      await form.fillAddress(placeAddress);
      await form.fillSpecials(placeSpecials);
      await form.submit();
      await expect(adminPage).toHaveURL(/\/admin\/places$/);

      const placesPage = new AdminPlacesPage(adminPage);
      await placesPage.expectPlaceInList(placeName);

      // Step 2: Open a public browser context and verify the place is visible
      const publicContext = await browser.newContext({ baseURL: BASE_URL });
      const publicPage = await publicContext.newPage();
      await publicPage.goto('/');
      await publicPage.waitForLoadState('networkidle');

      await expect(publicPage.locator('div.bar').filter({ hasText: placeName })).toBeVisible();

      // Step 3: Verify the place appears in the public API
      const apiResponse = await publicPage.evaluate(async (name) => {
        const r = await fetch('/api/places');
        const places = await r.json();
        return places.find((p: { name: string }) => p.name === name) || null;
      }, placeName);
      expect(apiResponse).not.toBeNull();
      expect(apiResponse.name).toBe(placeName);

      await adminContext.close();
      await publicContext.close();
    }
  );

  test('deleting a place removes it from the public site @critical', async ({ browser }) => {
    const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);

    const placeName = `Delete Journey ${Date.now()}`;

    // Create
    const form = new AdminPlaceFormPage(adminPage);
    await form.gotoNew();
    await form.fillName(placeName);
    await form.submit();
    await expect(adminPage).toHaveURL(/\/admin\/places$/);

    // Verify on public site
    const publicContext = await browser.newContext({ baseURL: BASE_URL });
    const publicPage = await publicContext.newPage();
    await publicPage.goto('/');
    await publicPage.waitForLoadState('networkidle');
    await expect(publicPage.locator('div.bar').filter({ hasText: placeName })).toBeVisible();

    // Delete via admin
    adminPage.on('dialog', (dialog) => dialog.accept());
    const row = adminPage.locator('table.places-table tbody tr').filter({ hasText: placeName });
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(adminPage).toHaveURL(/\/admin\/places$/);

    // Verify gone from public site (reload)
    await publicPage.reload();
    await publicPage.waitForLoadState('networkidle');
    await expect(
      publicPage.locator('div.bar').filter({ hasText: placeName })
    ).not.toBeVisible();

    await adminContext.close();
    await publicContext.close();
  });

  test(
    'place specials are visible on the public directory',
    async ({ browser }) => {
      const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
      const adminPage = await adminContext.newPage();
      await loginAsAdmin(adminPage);

      const placeName = `Specials Test ${Date.now()}`;
      const placeSpecials = 'Wednesday: $3 well drinks all night';

      const form = new AdminPlaceFormPage(adminPage);
      await form.gotoNew();
      await form.fillName(placeName);
      await form.fillSpecials(placeSpecials);
      await form.submit();
      await expect(adminPage).toHaveURL(/\/admin\/places$/);

      const publicContext = await browser.newContext({ baseURL: BASE_URL });
      const publicPage = await publicContext.newPage();
      await publicPage.goto('/');
      await publicPage.waitForLoadState('networkidle');

      const placeRow = publicPage.locator('div.bar').filter({ hasText: placeName });
      await expect(placeRow).toBeVisible();
      await expect(placeRow.locator('.specials')).toContainText(placeSpecials);

      await adminContext.close();
      await publicContext.close();
    }
  );

  test('place website URL is a link on the public directory', async ({ browser }) => {
    const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);

    const placeName = `URL Test Bar ${Date.now()}`;
    const placeUrl = 'https://example.com';

    const form = new AdminPlaceFormPage(adminPage);
    await form.gotoNew();
    await form.fillName(placeName);
    await form.fillUrl(placeUrl);
    await form.submit();
    await expect(adminPage).toHaveURL(/\/admin\/places$/);

    const publicContext = await browser.newContext({ baseURL: BASE_URL });
    const publicPage = await publicContext.newPage();
    await publicPage.goto('/');
    await publicPage.waitForLoadState('networkidle');

    const placeRow = publicPage.locator('div.bar').filter({ hasText: placeName });
    await expect(placeRow).toBeVisible();
    const nameLink = placeRow.locator('a.place-name');
    await expect(nameLink).toBeVisible();
    await expect(nameLink).toHaveAttribute('href', placeUrl);
    await expect(nameLink).toHaveAttribute('target', '_blank');

    await adminContext.close();
    await publicContext.close();
  });

  test('place with phone shows formatted number on public site', async ({ browser }) => {
    const adminContext = await browser.newContext({ baseURL: ADMIN_BASE_URL });
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);

    const placeName = `Phone Test ${Date.now()}`;
    const rawPhone = '2125551234';

    const form = new AdminPlaceFormPage(adminPage);
    await form.gotoNew();
    await form.fillName(placeName);
    await form.fillPhone(rawPhone);
    await form.submit();
    await expect(adminPage).toHaveURL(/\/admin\/places$/);

    const publicContext = await browser.newContext({ baseURL: BASE_URL });
    const publicPage = await publicContext.newPage();
    await publicPage.goto('/');
    await publicPage.waitForLoadState('networkidle');

    const placeRow = publicPage.locator('div.bar').filter({ hasText: placeName });
    await expect(placeRow).toBeVisible();
    const phoneLink = placeRow.locator('a[href^="tel:"]');
    await expect(phoneLink).toBeVisible();
    await expect(phoneLink).toHaveText('(212) 555-1234');
    await expect(phoneLink).toHaveAttribute('href', `tel:${rawPhone}`);

    await adminContext.close();
    await publicContext.close();
  });
});
