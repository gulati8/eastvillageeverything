/**
 * Authentication helpers for admin tests.
 *
 * Provides a reusable login function that navigates to /admin/login,
 * submits credentials, and waits for the redirect to /admin/places.
 *
 * Usage in a test:
 *   import { loginAsAdmin } from '../utils/auth';
 *   await loginAsAdmin(page);
 */
import { type Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@eastvillageeverything.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
export const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${ADMIN_BASE_URL}/admin/login`);
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();

  // Should land on places list after successful login
  await expect(page).toHaveURL(/\/admin\/places/);
}

export async function logoutFromAdmin(page: Page): Promise<void> {
  await page.locator('form[action="/admin/logout"] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin\/login/);
}
