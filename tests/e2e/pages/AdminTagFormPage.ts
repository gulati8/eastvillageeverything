import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminTagFormPage extends BasePage {
  async gotoNew(): Promise<void> {
    await super.goto('/admin/tags/new');
  }

  async gotoEdit(id: string): Promise<void> {
    await super.goto(`/admin/tags/${id}/edit`);
  }

  async fillValue(value: string): Promise<void> {
    await this.page.getByLabel('Value (internal) *').fill(value);
  }

  async fillDisplay(display: string): Promise<void> {
    await this.page.getByLabel('Display Name *').fill(display);
  }

  async fillSortOrder(order: string): Promise<void> {
    await this.page.getByLabel('Sort Order').fill(order);
  }

  async selectParentTag(parentDisplay: string): Promise<void> {
    await this.page.getByLabel('Parent Tag (optional)').selectOption({ label: parentDisplay });
  }

  async clearValue(): Promise<void> {
    await this.page.getByLabel('Value (internal) *').fill('');
  }

  async clearDisplay(): Promise<void> {
    await this.page.getByLabel('Display Name *').fill('');
  }

  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: /Tag/ }).click();
  }

  async clickCancel(): Promise<void> {
    await this.page.getByRole('link', { name: 'Cancel' }).click();
  }

  async expectValidationError(message: string): Promise<void> {
    await expect(this.page.locator('.alert-danger')).toContainText(message);
  }

  async expectHeadingNew(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'New Tag' })).toBeVisible();
  }

  async expectHeadingEdit(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Edit Tag' })).toBeVisible();
  }
}
