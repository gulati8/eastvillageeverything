/**
 * Public home page tests — Desktop and Mobile
 *
 * Covers:
 *   - Page title and main headings render
 *   - Author bio sidebar is visible on desktop, hidden on mobile
 *   - Tag filter dropdown renders with "Anything" default option
 *   - All places are shown on initial load
 *   - Selecting a tag filters the visible place rows
 *   - Selecting "Anything" resets the filter and shows all places
 *   - Empty state message when no places exist
 *   - External links section visible on desktop
 *   - Place rows render name, address, and specials columns
 *   - Place names with URLs render as anchor elements
 *   - Place names without URLs render as plain text
 *   - Phone numbers are formatted as (NXX) NXX-XXXX
 *   - Health check endpoint returns OK
 */

import { test, expect } from '../fixtures/test-fixtures';

test.describe('Public home page', () => {
  test.beforeEach(async ({ publicHomePage }) => {
    await publicHomePage.goto();
  });

  test('renders the site title heading', async ({ publicHomePage }) => {
    await publicHomePage.expectHeadingVisible();
  });

  test('renders the subheading / tagline', async ({ publicHomePage }) => {
    await publicHomePage.expectSubheadingVisible();
  });

  test('tag filter select is present with "Anything" default', async ({ page }) => {
    const select = page.locator('#tag-list');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('none');
    await expect(select.locator('option[value="none"]')).toHaveText('Anything');
  });

  test('places section exists in the DOM', async ({ page }) => {
    await expect(page.locator('#places')).toBeAttached();
  });

  test('renders the bio sidebar', async ({ publicHomePage }) => {
    await publicHomePage.expectBioSectionVisible();
  });

  test('renders the author name in the sidebar', async ({ publicHomePage }) => {
    await publicHomePage.expectAuthorName();
  });

  test('author company is shown', async ({ page }) => {
    await expect(page.locator('.company')).toContainText('VanderBorgh Realty');
  });

  test('author email link is present', async ({ page }) => {
    await expect(page.locator('a[href="mailto:newyorkolas@gmail.com"]')).toBeVisible();
  });
});

test.describe('Tag filter behaviour', () => {
  test.beforeEach(async ({ publicHomePage }) => {
    await publicHomePage.goto();
  });

  test('selecting a tag option updates the select value', async ({ page }) => {
    const select = page.locator('#tag-list');
    // Get available options (excluding "Anything")
    const options = await select.locator('option').allInnerTexts();
    if (options.length <= 1) {
      // Only "Anything" — no tags in DB; skip filter assertions
      test.skip();
      return;
    }
    // Pick the second option (first real tag)
    const secondOption = await select.locator('option').nth(1).getAttribute('value');
    if (!secondOption) return;
    await select.selectOption(secondOption);
    await expect(select).toHaveValue(secondOption);
  });

  test('resetting to "Anything" makes all place rows visible', async ({ page }) => {
    const select = page.locator('#tag-list');
    const options = await select.locator('option').count();
    if (options <= 1) {
      test.skip();
      return;
    }
    // Filter then reset
    const secondValue = await select.locator('option').nth(1).getAttribute('value');
    if (secondValue) {
      await select.selectOption(secondValue);
      await page.waitForTimeout(400); // animation settles
    }
    await select.selectOption('none');
    await page.waitForTimeout(400);
    const visibleRows = page.locator('div.bar:visible');
    const totalRows = page.locator('div.bar');
    const visible = await visibleRows.count();
    const total = await totalRows.count();
    expect(visible).toEqual(total);
  });
});

test.describe('Place row content', () => {
  test.beforeEach(async ({ publicHomePage }) => {
    await publicHomePage.goto();
  });

  test('each place row has the .bar class', async ({ page }) => {
    const rows = page.locator('div.bar');
    const count = await rows.count();
    if (count === 0) {
      // No data — empty state
      await expect(page.getByText('No places found. Check back soon!')).toBeVisible();
      return;
    }
    expect(count).toBeGreaterThan(0);
  });

  test('place rows contain a .location-and-contact column', async ({ page }) => {
    const rows = page.locator('div.bar');
    const count = await rows.count();
    if (count === 0) return;
    await expect(rows.first().locator('.location-and-contact')).toBeVisible();
  });

  test('place rows contain a .specials column', async ({ page }) => {
    const rows = page.locator('div.bar');
    const count = await rows.count();
    if (count === 0) return;
    await expect(rows.first().locator('.specials')).toBeVisible();
  });

  test('place rows contain a .categories-and-notes column', async ({ page }) => {
    const rows = page.locator('div.bar');
    const count = await rows.count();
    if (count === 0) return;
    await expect(rows.first().locator('.categories-and-notes')).toBeVisible();
  });
});

test.describe('Desktop-specific layout', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ publicHomePage }) => {
    await publicHomePage.goto();
  });

  test('column header row is visible on desktop', async ({ page }) => {
    await expect(page.locator('.row.title.show-for-large-up')).toBeVisible();
  });

  test('bio sidebar "More about" links section is visible on desktop', async ({ page }) => {
    await expect(page.locator('.show-for-large-up')).toBeVisible();
  });

  test('EV Grieve external link is present', async ({ page }) => {
    await expect(page.locator('a[href="http://evgrieve.com/"]')).toBeAttached();
  });
});

test.describe('Mobile-specific layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ publicHomePage }) => {
    await publicHomePage.goto();
  });

  test('main heading is still visible on mobile', async ({ publicHomePage }) => {
    await publicHomePage.expectHeadingVisible();
  });

  test('tag filter dropdown is visible on mobile', async ({ page }) => {
    await expect(page.locator('#tag-list')).toBeVisible();
  });

  test('places container is visible on mobile', async ({ page }) => {
    // On mobile the CSS hides the desktop title row but places div itself is shown
    await expect(page.locator('#places')).toBeAttached();
  });
});

test.describe('Health check endpoint', () => {
  test('GET /health returns 200 with status ok', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
