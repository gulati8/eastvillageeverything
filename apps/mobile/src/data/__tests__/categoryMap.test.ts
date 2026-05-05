import { CATEGORY_MAP, inferCategory } from '../categoryMap';
import type { CategoryKey } from '../placeV2Display';

// ---------------------------------------------------------------------------
// CATEGORY_MAP structure
// ---------------------------------------------------------------------------

describe('CATEGORY_MAP', () => {
  const expectedKeys: CategoryKey[] = ['dive', 'pub', 'cocktail', 'coffee', 'diner', 'punk'];

  it('has all 6 category keys', () => {
    for (const key of expectedKeys) {
      expect(CATEGORY_MAP).toHaveProperty(key);
    }
  });

  it.each(expectedKeys)('%s entry has a non-empty tint', (key) => {
    expect(CATEGORY_MAP[key].tint).toBeTruthy();
  });

  it.each(expectedKeys)('%s entry has a non-empty accent', (key) => {
    expect(CATEGORY_MAP[key].accent).toBeTruthy();
  });

  it.each(expectedKeys)('%s entry has a non-empty label', (key) => {
    expect(CATEGORY_MAP[key].label).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// inferCategory — keyword matching
// ---------------------------------------------------------------------------

describe('inferCategory', () => {
  describe('keyword matching', () => {
    it('returns "dive" for "Dive bar"', () => {
      expect(inferCategory('Dive bar')).toBe('dive');
    });

    it('returns "pub" for "Irish pub"', () => {
      expect(inferCategory('Irish pub')).toBe('pub');
    });

    it('returns "cocktail" for "Cocktail bar"', () => {
      expect(inferCategory('Cocktail bar')).toBe('cocktail');
    });

    it('returns "coffee" for "Coffee"', () => {
      expect(inferCategory('Coffee')).toBe('coffee');
    });

    it('returns "coffee" for "Espresso bar"', () => {
      expect(inferCategory('Espresso bar')).toBe('coffee');
    });

    it('returns "diner" for "Ukrainian diner"', () => {
      expect(inferCategory('Ukrainian diner')).toBe('diner');
    });

    it('returns "punk" for "Punk bar"', () => {
      expect(inferCategory('Punk bar')).toBe('punk');
    });
  });

  describe('default fallback', () => {
    it('returns "dive" for an unrecognised string', () => {
      expect(inferCategory('Unknown type')).toBe('dive');
    });

    it('returns "dive" for null', () => {
      expect(inferCategory(null)).toBe('dive');
    });

    it('returns "dive" for undefined', () => {
      expect(inferCategory(undefined)).toBe('dive');
    });

    it('returns "dive" for an empty string', () => {
      expect(inferCategory('')).toBe('dive');
    });
  });

  describe('case insensitivity', () => {
    it('returns "dive" for "DIVE BAR"', () => {
      expect(inferCategory('DIVE BAR')).toBe('dive');
    });

    it('returns "pub" for "IRISH PUB"', () => {
      expect(inferCategory('IRISH PUB')).toBe('pub');
    });

    it('returns "cocktail" for "COCKTAIL BAR"', () => {
      expect(inferCategory('COCKTAIL BAR')).toBe('cocktail');
    });

    it('returns "coffee" for "ESPRESSO BAR"', () => {
      expect(inferCategory('ESPRESSO BAR')).toBe('coffee');
    });

    it('returns "diner" for "UKRAINIAN DINER"', () => {
      expect(inferCategory('UKRAINIAN DINER')).toBe('diner');
    });

    it('returns "punk" for "PUNK BAR"', () => {
      expect(inferCategory('PUNK BAR')).toBe('punk');
    });
  });
});
