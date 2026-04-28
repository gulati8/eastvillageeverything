import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminTagDeletePage extends BasePage {
  async gotoDelete(id: string): Promise<void> {
    await super.goto(`/admin/tags/${id}/delete`);
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Delete Tag' })).toBeVisible();
  }

  async expectWarningVisible(tagDisplay: string): Promise<void> {
    await expect(this.page.locator('.alert-warning')).toContainText(tagDisplay);
  }

  async expectAffectedPlaceWarning(placeName: string): Promise<void> {
    await expect(this.page.locator('.alert-danger')).toContainText(placeName);
  }

  async expectNoAffectedPlaces(): Promise<void> {
    await expect(this.page.getByText('This tag is not currently used by any places.')).toBeVisible();
  }

  async confirmDelete(): Promise<void> {
    await this.page.getByRole('button', { name: 'Yes, Delete Tag' }).click();
  }

  async clickCancel(): Promise<void> {
    await this.page.getByRole('link', { name: 'Cancel' }).click();
  }
}
