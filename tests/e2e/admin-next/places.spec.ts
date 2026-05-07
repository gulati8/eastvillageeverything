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

test.describe('Next.js admin — places', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('list page renders all places', async ({ page, request }) => {
    // No `?limit=` so the API returns the full set, matching what the admin
    // server component renders (PlaceModel.findAll() with no limit option).
    const apiRes = await request.get(`${API}/api/places`);
    const apiPlaces = await apiRes.json();
    await page.goto(`${ADMIN}/places`);
    const rows = page.locator('main ul > li');
    await expect(rows).toHaveCount(apiPlaces.length);
  });

  test('create + edit + delete a place', async ({ page, request }) => {
    const name = `E2E place ${Date.now()}`;
    await page.goto(`${ADMIN}/places/new`);
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="address"]', '123 Test St');
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForURL(/\/places$/);

    const res1 = await request.get(`${API}/api/places?limit=200`);
    const list1 = await res1.json();
    const created = list1.find((p: any) => p.name === name);
    expect(created).toBeTruthy();
    expect(created.neighborhood_id).toBeTruthy();

    await page.goto(`${ADMIN}/places/${created.key}/edit`);
    await page.fill('input[name="address"]', '456 Updated Ave');
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForURL(/\/places$/);

    const res2 = await request.get(`${API}/api/places/${created.key}`);
    const fresh = await res2.json();
    expect(fresh.address).toBe('456 Updated Ave');

    page.on('dialog', (d) => d.accept());
    await page.goto(`${ADMIN}/places/${created.key}/edit`);
    await page.click('button:has-text("Delete")');
    await page.waitForURL(/\/places$/);

    const res3 = await request.get(`${API}/api/places/${created.key}`);
    expect(res3.status()).toBe(404);
  });
});
