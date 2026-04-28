/**
 * Accessibility tests.
 *
 * Uses axe-core via @axe-core/playwright to detect WCAG 2.1 AA violations.
 *
 * Covers:
 *   - Public home page has no critical axe violations
 *   - Admin login page has no critical axe violations
 *   - Admin places list has no critical axe violations (authenticated)
 *   - Admin new place form has no critical axe violations
 *   - Admin tags list has no critical axe violations
 *   - Admin new tag form has no critical axe violations
 *
 * Note: violations with impact "minor" and "moderate" are tolerated via
 * disabledRules exclusions. The test fails only on "critical" and "serious"
 * impacts to focus CI signal on actionable issues.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsAdmin, ADMIN_BASE_URL } from '../utils/auth';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// Helper: run axe and assert zero violations at critical/serious level
async function assertNoA11yViolations(page: Parameters<typeof test>[1] extends (args: infer A) => void ? A extends { page: infer P } ? P : never : never): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  if (criticalOrSerious.length > 0) {
    const summary = criticalOrSerious
      .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
      .join('\n');
    expect.soft(criticalOrSerious, `Accessibility violations:\n${summary}`).toHaveLength(0);
  }
}

test.describe('Accessibility — public site', () => {
  test('public home page has no critical/serious axe violations @critical', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page);
  });
});

test.describe('Accessibility — admin site', () => {
  test('admin login page has no critical/serious axe violations', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page);
  });

  test('admin places list has no critical/serious axe violations', async ({ page }) => {
    await loginAsAdmin(page);
    await assertNoA11yViolations(page);
  });

  test('admin new place form has no critical/serious axe violations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page);
  });

  test('admin tags list has no critical/serious axe violations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/tags`);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page);
  });

  test('admin new tag form has no critical/serious axe violations', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page);
  });
});

test.describe('Accessibility — form error states', () => {
  test('validation error state on place form is accessible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/places/new`);
    await page.waitForLoadState('networkidle');
    // Force server-side validation error by removing required and submitting empty
    await page.evaluate(() => {
      const el = document.getElementById('name') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
    });
    await page.getByRole('button', { name: /Place/ }).click();
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page);
  });

  test('validation error state on tag form is accessible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${ADMIN_BASE_URL}/admin/tags/new`);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.getElementById('value') as HTMLInputElement | null;
      if (el) el.removeAttribute('required');
      const el2 = document.getElementById('display') as HTMLInputElement | null;
      if (el2) el2.removeAttribute('required');
    });
    await page.getByRole('button', { name: /Tag/ }).click();
    await page.waitForLoadState('networkidle');
    await assertNoA11yViolations(page);
  });
});
