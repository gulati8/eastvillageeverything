/**
 * Public support page (/support)
 *
 * Covers:
 *   - Page responds 200 @critical
 *   - Heading "Support" visible
 *   - Describes the app and shows the support contact email as a mailto link
 *   - Links to the privacy policy and back to the home page
 */
import { test, expect } from '@playwright/test';

test.describe('Public support page', () => {
  test('responds 200 with the Support heading @critical', async ({ page }) => {
    const response = await page.goto('/support');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Support', exact: true })).toBeVisible();
    await expect(page).toHaveTitle(/Support/);
  });

  test('describes the app and shows the contact email', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByRole('heading', { name: 'About the app' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Get in touch' })).toBeVisible();
    const mail = page.getByRole('link', { name: 'amit@gulatilabs.me' });
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute('href', 'mailto:amit@gulatilabs.me');
  });

  test('links to the privacy policy and home', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByRole('link', { name: 'privacy policy' })).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name: 'Back to East Village Everything' })).toHaveAttribute('href', '/');
  });
});
