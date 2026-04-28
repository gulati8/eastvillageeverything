import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminLoginPage extends BasePage {
  async goto(): Promise<void> {
    await super.goto('/admin/login');
  }

  async fillEmail(email: string): Promise<void> {
    await this.page.getByLabel('Email').fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.page.getByLabel('Password').fill(password);
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.page.locator('.alert-danger')).toContainText(message);
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'EVE Admin' })).toBeVisible();
  }
}
