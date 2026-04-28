import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class PublicHomePage extends BasePage {
  async goto(): Promise<void> {
    await super.goto('/');
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: 'East Village Everything' })
    ).toBeVisible();
  }

  async expectSubheadingVisible(): Promise<void> {
    await expect(
      this.page.getByText("An insider's guide to East Village happy hours and nightly specials.")
    ).toBeVisible();
  }

  async expectTagFilterVisible(): Promise<void> {
    await expect(this.page.locator('#tag-list')).toBeVisible();
  }

  async selectTag(value: string): Promise<void> {
    await this.page.locator('#tag-list').selectOption(value);
  }

  async selectAnyTag(): Promise<void> {
    await this.page.locator('#tag-list').selectOption('none');
  }

  async getVisiblePlaceCount(): Promise<number> {
    return await this.page.locator('div.bar:visible').count();
  }

  async expectPlaceName(name: string): Promise<void> {
    await expect(this.page.locator('.place-name').filter({ hasText: name })).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.page.getByText('No places found. Check back soon!')).toBeVisible();
  }

  async expectBioSectionVisible(): Promise<void> {
    await expect(this.page.locator('.bio')).toBeVisible();
  }

  async expectAuthorName(): Promise<void> {
    await expect(this.page.locator('.name').filter({ hasText: 'Nicholas VanderBorgh' })).toBeVisible();
  }
}
