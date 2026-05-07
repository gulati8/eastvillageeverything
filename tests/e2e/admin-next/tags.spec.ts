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

test.describe('Next.js admin — tags', () => {
  test.beforeEach(async ({ page }) => login(page));

  test('create + edit + delete a tag', async ({ page, request }) => {
    const display = `E2E tag ${Date.now()}`;
    await page.goto(`${ADMIN}/tags/new`);
    await page.fill('input[name="display"]', display);
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForURL(/\/tags$/);

    const res1 = await request.get(`${API}/api/tags`);
    const tags1 = await res1.json();
    expect(tags1.find((t: any) => t.display === display)).toBeTruthy();

    await page.goto(`${ADMIN}/tags`);
    await page.click(`a:has-text("${display}")`);
    await page.fill('input[name="display"]', `${display} (updated)`);
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForURL(/\/tags$/);

    const res2 = await request.get(`${API}/api/tags`);
    const tags2 = await res2.json();
    expect(tags2.find((t: any) => t.display === `${display} (updated)`)).toBeTruthy();

    page.on('dialog', (d) => d.accept());
    await page.click(`a:has-text("${display} (updated)")`);
    await page.click('button:has-text("Delete")');
    await page.waitForURL(/\/tags$/);
  });

  test('drag-reorder persists', async ({ page }) => {
    await page.goto(`${ADMIN}/tags`);
    const items = page.locator('main ul > li');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    if (count < 2) {
      test.skip(true, 'Need at least 2 tags to test reorder');
      return;
    }
    const before = await items.allTextContents();

    // dnd-kit's PointerSensor needs real pointer events with >5px movement,
    // not Playwright's HTML5 dragTo. Simulate with the mouse API.
    const firstHandle = items.nth(0).locator('span').first();
    const secondHandle = items.nth(1).locator('span').first();
    const f = await firstHandle.boundingBox();
    const s = await secondHandle.boundingBox();
    if (!f || !s) throw new Error('Could not get drag handle bounding boxes');
    await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
    await page.mouse.down();
    // First nudge past the 5px activation distance
    await page.mouse.move(f.x + f.width / 2 + 10, f.y + f.height / 2 + 10, { steps: 4 });
    // Then to past the second item so we drop after it
    await page.mouse.move(s.x + s.width / 2, s.y + s.height + 10, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1200);

    await page.reload();
    await expect(page.locator('main ul > li').first()).toBeVisible();
    const after = await page.locator('main ul > li').allTextContents();
    expect(after[0]).not.toBe(before[0]);
  });
});
