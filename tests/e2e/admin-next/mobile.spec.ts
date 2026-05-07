import { test, expect, devices } from '@playwright/test';

const ADMIN = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

// devices['iPhone 13'] forces webkit which isn't installed in this env;
// devices['Pixel 7'] gives chromium with a comparable 390-wide mobile viewport.
test.use({ ...devices['Pixel 7'] });

test.describe('Admin on mobile viewport', () => {
  test('login + nav fit one-handed', async ({ page }) => {
    await page.goto(`${ADMIN}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places/);

    await expect(page.locator('a:has-text("Places")')).toBeVisible();
    await expect(page.locator('a:has-text("Tags")')).toBeVisible();
    await expect(page.locator('a:has-text("Neighborhoods")')).toBeVisible();

    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('place edit form has no horizontal overflow', async ({ page, request }) => {
    await page.goto(`${ADMIN}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places/);

    const apiRes = await request.get(`${API}/api/places?limit=1`);
    const places = await apiRes.json();
    await page.goto(`${ADMIN}/places/${places[0].key}/edit`);

    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);

    await expect(page.locator('span:has-text("Name")')).toBeVisible();
    await expect(page.locator('span:has-text("Specials")')).toBeVisible();
  });
});
