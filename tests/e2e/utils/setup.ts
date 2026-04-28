/**
 * Global setup for the E2E test suite.
 *
 * Playwright calls this before any test runs. We verify the app is reachable
 * and fail fast with a clear message if it is not — rather than letting every
 * test time out individually.
 */
import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
  const adminBaseURL = process.env.ADMIN_BASE_URL ?? 'http://admin.localhost:3000';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Verify public site is up
  try {
    const response = await page.goto(`${baseURL}/health`);
    if (!response || response.status() !== 200) {
      throw new Error(`Health check returned status ${response?.status()}`);
    }
  } catch (err) {
    await browser.close();
    throw new Error(
      `Public site is not reachable at ${baseURL}. ` +
      `Start the app with \`npm run dev\` or \`docker-compose up\` before running tests.\n` +
      `Original error: ${(err as Error).message}`
    );
  }

  // Verify admin site is reachable (same server, just via subdomain routing)
  try {
    await page.goto(`${adminBaseURL}/admin/login`);
  } catch {
    // Admin subdomain unreachable is a warning, not a blocker for public tests
    console.warn(`Warning: Admin site not reachable at ${adminBaseURL}. Admin tests will fail.`);
  }

  await browser.close();
}
