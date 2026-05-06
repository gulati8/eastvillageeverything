import { test, expect } from '@playwright/test';

const APP = process.env.APP_BASE_URL ?? 'http://localhost:3000';
// Defaults to e2e test admin seeded in dev DB. Override via env in CI / other environments.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const ADMIN_PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

test.describe('Admin tag form — redesign fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${APP}/admin/login`);
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/places/);
  });

  test('creating a primary tag with tint and accent persists all fields', async ({ page }) => {
    const value = `redesign-test-${Date.now()}`;
    await page.goto(`${APP}/admin/tags/new`);

    await page.fill('#value', value);
    await page.fill('#display', 'Redesign Test');
    await page.fill('#sort_order', '999');
    await page.check('#is_primary');
    await page.fill('#tint', '#E07B3F');
    await page.fill('#accent', '#FBF6EE');
    await page.fill('#fallback_image_url', 'https://example.com/fallback.jpg');

    await page.getByRole('button', { name: /Tag/ }).click();
    await page.waitForURL(/\/admin\/tags/);

    // Verify via API
    const res = await page.request.get(`${APP}/api/tags`);
    const body = await res.json();
    const created = body.find((t: any) => t.value === value);
    expect(created).toBeTruthy();
    expect(created.is_primary).toBe(true);
    expect(created.tint).toBe('#E07B3F');
    expect(created.accent).toBe('#FBF6EE');
    expect(created.fallback_image_url).toBe('https://example.com/fallback.jpg');
  });

  test('uncheck is_primary clears the flag', async ({ page }) => {
    const value = `redesign-toggle-${Date.now()}`;
    // Create a primary tag
    await page.goto(`${APP}/admin/tags/new`);
    await page.fill('#value', value);
    await page.fill('#display', 'Toggle Test');
    await page.fill('#sort_order', '998');
    await page.check('#is_primary');
    await page.getByRole('button', { name: /Tag/ }).click();
    await page.waitForURL(/\/admin\/tags/);

    // Find and edit the tag — locate via API to get its id
    const apiRes = await page.request.get(`${APP}/api/tags`);
    const allTags = await apiRes.json();
    const created = allTags.find((t: any) => t.value === value);
    expect(created).toBeTruthy();

    // Navigate to the tag edit page. The flat /api/tags response does not include id,
    // so we locate the edit link href via the admin list, filtering by the unique value
    // (shown as <code> in the row). This avoids display-name collisions in parallel runs.
    await page.goto(`${APP}/admin/tags`);
    const tagRow = page.locator('#tagsTableBody tr').filter({ has: page.locator(`code:has-text("${value}")`) });
    const editHref = await tagRow.getByRole('link', { name: 'Edit' }).getAttribute('href');
    await page.goto(`${APP}${editHref}`);
    await page.waitForURL(/\/admin\/tags\/.+/);

    await page.uncheck('#is_primary');
    await page.getByRole('button', { name: /Tag/ }).click();
    await page.waitForURL(/\/admin\/tags(\?.*)?$/);

    const verifyRes = await page.request.get(`${APP}/api/tags`);
    const verifyBody = await verifyRes.json();
    const updated = verifyBody.find((t: any) => t.value === value);
    expect(updated.is_primary).toBe(false);
  });
});
