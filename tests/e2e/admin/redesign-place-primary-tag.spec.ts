import { test, expect } from '@playwright/test';

const APP = process.env.APP_BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

const SEED_TAG_VALUE = `e2e-primary-${Date.now()}`;
const SEED_TAG_DISPLAY = 'E2E Primary';

async function login(page: any) {
  await page.goto(`${APP}/admin/login`);
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\/places/);
}

test.describe('Admin place form — primary tag dropdown', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page);
    await page.goto(`${APP}/admin/tags/new`);
    await page.fill('#value', SEED_TAG_VALUE);
    await page.fill('#display', SEED_TAG_DISPLAY);
    await page.fill('#sort_order', '997');
    await page.check('#is_primary');
    // Use button name matcher to avoid the navbar logout button colliding.
    await page.getByRole('button', { name: /Tag/ }).click();
    await page.waitForURL(/\/admin\/tags/);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('primary tag dropdown only shows is_primary tags', async ({ page }) => {
    await page.goto(`${APP}/admin/places/new`);
    const options = await page.locator('#primary_tag_id option').allTextContents();
    expect(options[0]).toContain('None');
    expect(options.length).toBeGreaterThan(1);

    const apiRes = await page.request.get(`${APP}/api/tags`);
    const allTags = await apiRes.json();
    const primaryDisplayNames = allTags
      .filter((t: any) => t.is_primary)
      .map((t: any) => t.display);

    for (const opt of options.slice(1)) {
      expect(primaryDisplayNames).toContain(opt.trim());
    }
    expect(primaryDisplayNames).toContain(SEED_TAG_DISPLAY);
  });

  test('selecting a primary tag persists primary_tag_id on the place', async ({ page }) => {
    await page.goto(`${APP}/admin/places`);
    // Use a visible Edit link — on mobile viewports the desktop table is hidden via CSS
    // and only the card view's links are visible, so filter to visible elements.
    const firstEditLink = page.locator('a:has-text("Edit")').filter({ visible: true }).first();
    await firstEditLink.click();
    await page.waitForURL(/\/admin\/places\/.+\/edit/);

    const url = page.url();
    const placeId = url.match(/\/places\/([^/]+)\/edit/)?.[1];
    expect(placeId).toBeTruthy();

    const select = page.locator('#primary_tag_id');
    await select.selectOption({ label: SEED_TAG_DISPLAY });
    const chosenValue = await select.inputValue();
    expect(chosenValue).toBeTruthy();

    // Use button name matcher to disambiguate from logout
    await page.getByRole('button', { name: /Place/ }).click();
    await page.waitForURL(/\/admin\/places/);

    const res = await page.request.get(`${APP}/api/places/${placeId}`);
    const body = await res.json();
    expect(body.primary_tag_id).toBe(chosenValue);
  });
});
