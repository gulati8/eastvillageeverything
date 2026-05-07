import { test, expect } from '@playwright/test';

const ADMIN_BASE = process.env.ADMIN_BASE_URL ?? 'http://localhost:3001';
const EMAIL = process.env.ADMIN_EMAIL ?? 'e2e-test@eve.local';
const PASS = process.env.ADMIN_PASS ?? 'e2etest1234';

test.describe('Next.js admin auth', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/places`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('valid creds reach /places', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/places/);
    await expect(page.locator('h1')).toContainText('Places');
  });

  test('invalid creds bounce back with error', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('p').filter({ hasText: /invalid/i })).toBeVisible();
  });

  test('Sign out clears the session', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/login`);
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/places/);
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL(/\/login/);
    await page.goto(`${ADMIN_BASE}/places`);
    await expect(page).toHaveURL(/\/login/);
  });
});
