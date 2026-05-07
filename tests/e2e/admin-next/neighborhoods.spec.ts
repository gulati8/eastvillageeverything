import { test, expect, type Page } from '@playwright/test';

const ADMIN = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const API = process.env.API_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

async function login(page: Page) {
  await page.goto(`${ADMIN}/login`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/places/);
}

test.describe('Next.js admin — neighborhoods', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('default East Village exists', async ({ page }) => {
    await page.goto(`${ADMIN}/neighborhoods`);
    await expect(page.locator('a:has-text("East Village")')).toBeVisible();
    await expect(page.locator('span:has-text("Default")')).toBeVisible();
  });

  test('create from dedicated page', async ({ page, request }) => {
    const display = `E2E hood ${Date.now()}`;
    await page.goto(`${ADMIN}/neighborhoods/new`);
    await page.fill('input[name="display"]', display);
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForURL(/\/neighborhoods$/);
    const res = await request.get(`${API}/api/neighborhoods`);
    const list = await res.json();
    expect(list.find((n: any) => n.display === display)).toBeTruthy();
  });

  test('inline-add from place form persists', async ({ page, request }) => {
    const newHood = `Inline ${Date.now()}`;
    await page.goto(`${ADMIN}/places/new`);
    // Open the NeighborhoodPicker — its label is "Neighborhood" then a button
    // showing the current selection (default East Village).
    await page.click('button:has-text("East Village")');
    await page.fill('input[placeholder="Type to filter"]', newHood);
    await page.click(`button:has-text("Create \\"${newHood}\\"")`);
    // The dropdown closes after the action settles — wait for the filter
    // input to disappear, which is a definitive signal the transition resolved.
    await expect(page.locator('input[placeholder="Type to filter"]')).toBeHidden();

    await expect.poll(async () => {
      const res = await request.get(`${API}/api/neighborhoods`);
      const list = await res.json();
      return list.find((n: any) => n.display === newHood);
    }).toBeTruthy();
  });
});
