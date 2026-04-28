import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PublicDirectoryPage extends BasePage {
  async goto(): Promise<void> {
    await super.goto('/');
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'East Village Everything' })).toBeVisible();
  }

  async expectSubheadingVisible(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /insider's guide/ })
    ).toBeVisible();
  }

  async getTagFilterSelect() {
    return this.page.locator('#tag-list');
  }

  async selectTag(value: string): Promise<void> {
    await this.page.locator('#tag-list').selectOption(value);
  }

  async selectAnything(): Promise<void> {
    await this.page.locator('#tag-list').selectOption('none');
  }

  async getVisiblePlaceRows() {
    return this.page.locator('div.bar:visible');
  }

  async expectPlaceVisible(name: string): Promise<void> {
    await expect(this.page.locator('div.bar').filter({ hasText: name })).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.page.getByText('No places found. Check back soon!')).toBeVisible();
  }

  async expectAuthorInfoVisible(): Promise<void> {
    await expect(this.page.getByText('Nicholas VanderBorgh')).toBeVisible();
  }
}
