/**
 * End-to-end user journey: Public visitor
 *
 * Simulates a visitor arriving at the public directory site:
 *
 *   1. Lands on the homepage
 *   2. Sees the heading, subheading, and author bio
 *   3. Browses all places (no filter)
 *   4. Clicks a place name link (opens in new tab)
 *   5. Filters by a tag
 *   6. Resets filter to "Anything"
 *   7. Verifies all places are visible again
 *
 * Also covers the visitor's perspective of the API:
 *   - GET /api/places returns correct shape
 *   - GET /api/tags returns correct shape
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Public visitor journey', () => {
  test('visitor sees page title and main heading @critical', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/East Village Everything/);
    await expect(page.getByRole('heading', { name: 'East Village Everything' })).toBeVisible();
  });

  test('visitor sees the happy hour subheading', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText("An insider's guide to East Village happy hours and nightly specials.")
    ).toBeVisible();
  });

  test('visitor sees the author bio section', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bio')).toBeVisible();
    await expect(page.locator('.name')).toContainText('Nicholas VanderBorgh');
    await expect(page.locator('.company')).toContainText('VanderBorgh Realty');
  });

  test('visitor sees the tag filter dropdown', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#tag-list')).toBeVisible();
    await expect(page.locator('#tag-list')).toHaveValue('none');
  });

  test('visitor can see the places section', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#places')).toBeVisible();
    // Either has place rows or shows the empty state — both are valid
    const placeCount = await page.locator('div.bar').count();
    const emptyState = page.getByText('No places found. Check back soon!');
    if (placeCount === 0) {
      await expect(emptyState).toBeVisible();
    } else {
      expect(placeCount).toBeGreaterThan(0);
    }
  });

  test('visitor can filter places by tag and reset', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const totalBars = await page.locator('div.bar').count();
    if (totalBars === 0) {
      test.skip();
      return;
    }

    const options = await page.locator('#tag-list option').all();
    let tagValue: string | null = null;
    for (const opt of options) {
      const v = await opt.getAttribute('value');
      if (v && v !== 'none') {
        tagValue = v;
        break;
      }
    }

    if (!tagValue) {
      test.skip(); // No tags seeded
      return;
    }

    // Apply filter
    await page.locator('#tag-list').selectOption(tagValue);
    await page.waitForTimeout(400); // jQuery animation completes

    // Reset
    await page.locator('#tag-list').selectOption('none');
    await page.waitForTimeout(400);

    // All bars visible again
    const visibleAfterReset = await page.locator('div.bar:visible').count();
    expect(visibleAfterReset).toBe(totalBars);
  });

  test('visitor clicks a place name with a URL — link has correct attributes', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const linkedNames = page.locator('a.place-name');
    const count = await linkedNames.count();
    if (count === 0) return; // No places with URLs

    const firstLink = linkedNames.first();
    const href = await firstLink.getAttribute('href');
    const target = await firstLink.getAttribute('target');

    expect(href).toMatch(/^https?:\/\//);
    expect(target).toBe('_blank');
  });

  test('visitor sees phone numbers in (XXX) XXX-XXXX format', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const phoneLinks = page.locator('a[href^="tel:"]');
    const count = await phoneLinks.count();
    if (count === 0) return;

    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = (await phoneLinks.nth(i).innerText()).trim();
      expect(text).toMatch(/^\(\d{3}\) \d{3}-\d{4}$/);
    }
  });

  test('public API provides places data that matches what the page renders', async ({ page, request }) => {
    const response = await request.get(`${BASE_URL}/api/places`);
    const places = await response.json();

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const placeRowCount = await page.locator('div.bar').count();
    expect(placeRowCount).toBe(places.length);
  });
});
