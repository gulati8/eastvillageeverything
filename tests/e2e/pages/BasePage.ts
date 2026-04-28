import { type Page, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async expectHeading(text: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  async expectAlertDanger(text: string): Promise<void> {
    await expect(this.page.locator('.alert-danger')).toContainText(text);
  }

  async expectNavBarBrand(name: string): Promise<void> {
    await expect(this.page.getByRole('link', { name })).toBeVisible();
  }
}
