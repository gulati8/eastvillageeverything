import type { PlaceResponse } from '@eve/shared-types';
import { transformPlace } from '../transformPlace';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makePlaceResponse(overrides: Partial<PlaceResponse> = {}): PlaceResponse {
  return {
    key: 'uuid-001',
    name: 'Test Place',
    address: '123 Test St',
    phone: '2125550100',
    url: 'https://example.com',
    specials: null,
    categories: 'Dive bar',
    notes: null,
    tags: ['happy', 'walkin'],
    lat: 40.7128,
    lng: -74.006,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('transformPlace', () => {
  describe('full PlaceResponse mapping', () => {
    it('maps key → key', () => {
      const result = transformPlace(makePlaceResponse({ key: 'abc-123' }));
      expect(result.key).toBe('abc-123');
    });

    it('maps name → name', () => {
      const result = transformPlace(makePlaceResponse({ name: 'Sophie\'s Bar' }));
      expect(result.name).toBe('Sophie\'s Bar');
    });

    it('maps address → street', () => {
      const result = transformPlace(makePlaceResponse({ address: '507 E 5th St' }));
      expect(result.street).toBe('507 E 5th St');
    });

    it('maps first line of categories → kind', () => {
      const result = transformPlace(makePlaceResponse({ categories: 'Dive bar\nIrish pub' }));
      expect(result.kind).toBe('Dive bar');
    });

    it('maps categories → category via inferCategory', () => {
      const result = transformPlace(makePlaceResponse({ categories: 'Cocktail bar' }));
      expect(result.category).toBe('cocktail');
    });

    it('maps tags → tags', () => {
      const result = transformPlace(makePlaceResponse({ tags: ['happy', 'walkin'] }));
      expect(result.tags).toEqual(['happy', 'walkin']);
    });

    it('maps phone → phone', () => {
      const result = transformPlace(makePlaceResponse({ phone: '2125550199' }));
      expect(result.phone).toBe('2125550199');
    });

    it('maps url → url', () => {
      const result = transformPlace(makePlaceResponse({ url: 'https://sophiesbar.com' }));
      expect(result.url).toBe('https://sophiesbar.com');
    });

    it('maps lat and lng', () => {
      const result = transformPlace(makePlaceResponse({ lat: 40.7259, lng: -73.9831 }));
      expect(result.lat).toBe(40.7259);
      expect(result.lng).toBe(-73.9831);
    });
  });

  describe('null / undefined handling', () => {
    it('sets street to null when address is null', () => {
      const result = transformPlace(makePlaceResponse({ address: null }));
      expect(result.street).toBeNull();
    });

    it('sets kind to null when categories is null', () => {
      const result = transformPlace(makePlaceResponse({ categories: null }));
      expect(result.kind).toBeNull();
    });

    it('defaults category to "dive" when categories is null', () => {
      const result = transformPlace(makePlaceResponse({ categories: null }));
      expect(result.category).toBe('dive');
    });

    it('defaults category to "dive" when categories is undefined', () => {
      const input = makePlaceResponse();
      // @ts-expect-error testing undefined at runtime
      input.categories = undefined;
      const result = transformPlace(input);
      expect(result.category).toBe('dive');
    });

    it('sets tags to [] when tags is an empty array', () => {
      const result = transformPlace(makePlaceResponse({ tags: [] }));
      expect(result.tags).toEqual([]);
    });

    it('sets tags to [] when tags is not an array', () => {
      const input = makePlaceResponse();
      // @ts-expect-error testing non-array at runtime
      input.tags = null;
      const result = transformPlace(input);
      expect(result.tags).toEqual([]);
    });

    it('sets phone to null when phone is null', () => {
      const result = transformPlace(makePlaceResponse({ phone: null }));
      expect(result.phone).toBeNull();
    });

    it('sets url to null when url is null', () => {
      const result = transformPlace(makePlaceResponse({ url: null }));
      expect(result.url).toBeNull();
    });

    it('sets lat and lng to null when not provided', () => {
      const result = transformPlace(makePlaceResponse({ lat: null, lng: null }));
      expect(result.lat).toBeNull();
      expect(result.lng).toBeNull();
    });
  });

  describe('enrichment fields', () => {
    it('sets photo to null', () => {
      expect(transformPlace(makePlaceResponse()).photo).toBeNull();
    });

    it('sets photoCredit to null', () => {
      expect(transformPlace(makePlaceResponse()).photoCredit).toBeNull();
    });

    it('sets pitch to null', () => {
      expect(transformPlace(makePlaceResponse()).pitch).toBeNull();
    });

    it('sets perfect to null', () => {
      expect(transformPlace(makePlaceResponse()).perfect).toBeNull();
    });

    it('sets insider to null', () => {
      expect(transformPlace(makePlaceResponse()).insider).toBeNull();
    });

    it('sets crowd to null', () => {
      expect(transformPlace(makePlaceResponse()).crowd).toBeNull();
    });

    it('sets vibe to null', () => {
      expect(transformPlace(makePlaceResponse()).vibe).toBeNull();
    });

    it('sets signal to null', () => {
      expect(transformPlace(makePlaceResponse()).signal).toBeNull();
    });

    it('sets crowdLevel to null', () => {
      expect(transformPlace(makePlaceResponse()).crowdLevel).toBeNull();
    });

    it('sets priceTier to null', () => {
      expect(transformPlace(makePlaceResponse()).priceTier).toBeNull();
    });

    it('sets hours to null', () => {
      expect(transformPlace(makePlaceResponse()).hours).toBeNull();
    });

    it('sets open to null', () => {
      expect(transformPlace(makePlaceResponse()).open).toBeNull();
    });

    it('sets distance to null', () => {
      expect(transformPlace(makePlaceResponse()).distance).toBeNull();
    });

    it('sets closesIn to null', () => {
      expect(transformPlace(makePlaceResponse()).closesIn).toBeNull();
    });

    it('sets cross to null', () => {
      expect(transformPlace(makePlaceResponse()).cross).toBeNull();
    });
  });

  describe('robustness', () => {
    it('does not throw when all nullable fields are null', () => {
      const input = makePlaceResponse({
        address: null,
        phone: null,
        url: null,
        specials: null,
        categories: null,
        notes: null,
        tags: [],
        lat: null,
        lng: null,
      });
      expect(() => transformPlace(input)).not.toThrow();
    });

    it('uses only the first line of a multi-line categories string for kind', () => {
      const result = transformPlace(
        makePlaceResponse({ categories: 'Irish pub\nLive music\nCash only' }),
      );
      expect(result.kind).toBe('Irish pub');
      expect(result.category).toBe('pub');
    });
  });
});
