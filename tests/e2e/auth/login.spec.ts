import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../utils/auth';

const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

test.describe('Admin authentication — login', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
  });

  test('login page renders the EVE Admin heading @critical', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.expectHeadingVisible();
  });

  test('login page has email and password fields', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('login page has Login button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('login with valid credentials redirects to places list @critical', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/places/);
    await expect(page.getByRole('heading', { name: 'Places' })).toBeVisible();
  });

  test('login with wrong password shows error and does not redirect', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.login(ADMIN_EMAIL, 'definitely-wrong-password');
    await loginPage.expectError('Invalid email or password');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('login with unregistered email shows error and does not redirect', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.login('nobody@nowhere.example.com', 'S0m3P@ssword');
    await loginPage.expectError('Invalid email or password');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('login with empty email and password shows required-field error', async ({ page }) => {
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('.alert-danger')).toContainText('Email and password are required');
  });

  test('login with email but no password shows error', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.fillEmail(ADMIN_EMAIL);
    // submit with empty password by clicking the button (HTML5 required catches it on client;
    // bypass by temporarily removing required attribute to test server-side validation)
    await page.evaluate(() => {
      const pw = document.getElementById('password') as HTMLInputElement | null;
      if (pw) pw.removeAttribute('required');
    });
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('.alert-danger')).toContainText('Email and password are required');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('already-authenticated user visiting /admin/login is redirected to places', async ({
    page,
  }) => {
    // First log in
    const loginPage = new AdminLoginPage(page);
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/places/);

    // Now revisit login page
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await expect(page).toHaveURL(/\/admin\/places/);
  });
});
