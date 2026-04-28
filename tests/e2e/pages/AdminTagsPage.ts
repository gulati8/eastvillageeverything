import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminTagsPage extends BasePage {
  async goto(): Promise<void> {
    await super.goto('/admin/tags');
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Tags' })).toBeVisible();
  }

  async clickNewTag(): Promise<void> {
    await this.page.getByRole('link', { name: 'New Tag' }).click();
  }

  async expectTagInList(displayName: string): Promise<void> {
    await expect(this.page.locator('#tagsTableBody').getByText(displayName)).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.page.getByText('No tags yet.')).toBeVisible();
  }

  async clickEditForTag(displayName: string): Promise<void> {
    const row = this.page.locator('#tagsTableBody tr').filter({ hasText: displayName });
    await row.getByRole('link', { name: 'Edit' }).click();
  }

  async clickDeleteForTag(displayName: string): Promise<void> {
    const row = this.page.locator('#tagsTableBody tr').filter({ hasText: displayName });
    await row.getByRole('link', { name: 'Delete' }).click();
  }
}
