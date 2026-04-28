import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPlaceFormPage extends BasePage {
  async gotoNew(): Promise<void> {
    await super.goto('/admin/places/new');
  }

  async gotoEdit(id: string): Promise<void> {
    await super.goto(`/admin/places/${id}/edit`);
  }

  async fillName(name: string): Promise<void> {
    await this.page.getByLabel('Name *').fill(name);
  }

  async fillAddress(address: string): Promise<void> {
    await this.page.getByLabel('Address').fill(address);
  }

  async fillPhone(phone: string): Promise<void> {
    await this.page.getByLabel('Phone').fill(phone);
  }

  async fillUrl(url: string): Promise<void> {
    await this.page.getByLabel('Website').fill(url);
  }

  async fillSpecials(specials: string): Promise<void> {
    await this.page.getByLabel('Specials').fill(specials);
  }

  async fillCategories(categories: string): Promise<void> {
    await this.page.getByLabel('Categories').fill(categories);
  }

  async fillNotes(notes: string): Promise<void> {
    await this.page.getByLabel('Notes').fill(notes);
  }

  async checkTag(tagValue: string): Promise<void> {
    await this.page.locator(`input[name="tags"][value="${tagValue}"]`).check();
  }

  async clearName(): Promise<void> {
    await this.page.getByLabel('Name *').fill('');
  }

  async submit(): Promise<void> {
    // Matches either "Create Place" or "Update Place"
    await this.page.getByRole('button', { name: /Place/ }).click();
  }

  async clickCancel(): Promise<void> {
    await this.page.getByRole('link', { name: 'Cancel' }).click();
  }

  async expectValidationError(message: string): Promise<void> {
    await expect(this.page.locator('.alert-danger')).toContainText(message);
  }

  async expectHeadingNew(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'New Place' })).toBeVisible();
  }

  async expectHeadingEdit(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Edit Place' })).toBeVisible();
  }

  async expectNameValue(name: string): Promise<void> {
    await expect(this.page.getByLabel('Name *')).toHaveValue(name);
  }
}
