/**
 * Public privacy policy page (/privacy)
 *
 * Covers:
 *   - Page responds 200 @critical
 *   - Heading "Privacy Policy" visible
 *   - Mentions the anonymous device ID, crash reports, and on-device saved places
 *   - Shows the support contact email as a mailto link
 *   - Links back to the home page
 */
import { test, expect } from '@playwright/test';

test.describe('Public privacy policy page', () => {
  test('responds 200 with the Privacy Policy heading @critical', async ({ page }) => {
    const response = await page.goto('/privacy');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page).toHaveTitle(/Privacy Policy/);
  });

  test('describes the data the app handles', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Anonymous device ID' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Crash reports' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Saved places' })).toBeVisible();
    await expect(page.getByText('No location.')).toBeVisible();
  });

  test('shows the contact email and a link home', async ({ page }) => {
    await page.goto('/privacy');
    const mail = page.getByRole('link', { name: 'amit@gulatilabs.me' });
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute('href', 'mailto:amit@gulatilabs.me');
    await expect(page.getByRole('link', { name: 'Back to East Village Everything' })).toHaveAttribute('href', '/');
  });
});
