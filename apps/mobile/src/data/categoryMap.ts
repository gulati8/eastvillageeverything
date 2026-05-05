import type { CategoryKey } from './placeV2Display';

export interface CategoryMeta {
  tint: string;
  accent: string;
  label: string;
}

export const CATEGORY_MAP: Record<CategoryKey, CategoryMeta> = {
  dive:     { tint: '#7A3B1F', accent: '#F4A05A', label: 'Dive bar' },
  pub:      { tint: '#3D2818', accent: '#D4A574', label: 'Pub' },
  cocktail: { tint: '#2B1B2F', accent: '#E8B4D0', label: 'Cocktail bar' },
  coffee:   { tint: '#3A2818', accent: '#C89F6F', label: 'Coffee' },
  diner:    { tint: '#7A2118', accent: '#F2C078', label: 'Diner' },
  punk:     { tint: '#1A1A1F', accent: '#F09060', label: 'Punk bar' },
};

export function inferCategory(categoriesField: string | null | undefined): CategoryKey {
  if (!categoriesField) return 'dive';

  const lower = categoriesField.toLowerCase();

  if (lower.includes('dive')) return 'dive';
  if (lower.includes('pub') || lower.includes('irish')) return 'pub';
  if (lower.includes('cocktail')) return 'cocktail';
  if (lower.includes('coffee') || lower.includes('espresso') || lower.includes('cafe')) return 'coffee';
  if (lower.includes('diner') || lower.includes('ukrainian') || lower.includes('restaurant')) return 'diner';
  if (lower.includes('punk')) return 'punk';

  return 'dive';
}
