import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPlacesPage extends BasePage {
  async goto(): Promise<void> {
    await super.goto('/admin/places');
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Places' })).toBeVisible();
  }

  async clickNewPlace(): Promise<void> {
    await this.page.getByRole('link', { name: 'New Place' }).click();
  }

  async clickSortByName(): Promise<void> {
    await this.page.getByRole('link', { name: /Name/ }).click();
  }

  async clickSortByUpdatedAt(): Promise<void> {
    await this.page.getByRole('link', { name: /Updated At/ }).click();
  }

  async clickSortByCreatedAt(): Promise<void> {
    await this.page.getByRole('link', { name: /Created At/ }).click();
  }

  async getPlaceCount(): Promise<number> {
    const rows = this.page.locator('table.places-table tbody tr');
    return await rows.count();
  }

  async clickEditForFirstPlace(): Promise<void> {
    await this.page.locator('table.places-table tbody tr').first()
      .getByRole('link', { name: 'Edit' }).click();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.page.getByText('No places yet.')).toBeVisible();
  }

  async expectPlaceInList(name: string): Promise<void> {
    await expect(this.page.locator('table.places-table').getByText(name)).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.page.getByRole('button', { name: 'Logout' }).click();
  }
}
