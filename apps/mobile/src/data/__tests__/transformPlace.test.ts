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

    it('ignores legacy categories', () => {
      const result = transformPlace(makePlaceResponse({ categories: 'Dive bar\nIrish pub' }));
      expect(result).not.toHaveProperty('kind');
      expect(result.tags).toEqual(['happy', 'walkin']);
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

    it('does not derive display fields from undefined categories', () => {
      const input = makePlaceResponse();
      // @ts-expect-error testing undefined at runtime
      input.categories = undefined;
      const result = transformPlace(input);
      expect(result).not.toHaveProperty('kind');
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
    it('maps photo_url to photo', () => {
      expect(transformPlace(makePlaceResponse({ photo_url: 'https://img.example.com/p.jpg' })).photo)
        .toBe('https://img.example.com/p.jpg');
    });

    it('maps photo_credit to photoCredit', () => {
      expect(transformPlace(makePlaceResponse({ photo_credit: 'Amit' })).photoCredit).toBe('Amit');
    });

    it('maps specials', () => {
      expect(transformPlace(makePlaceResponse({ specials: '$5 beer' })).specials).toBe('$5 beer');
    });

    it('maps notes', () => {
      expect(transformPlace(makePlaceResponse({ notes: 'Cash only' })).notes).toBe('Cash only');
    });

    it('maps pitch', () => {
      expect(transformPlace(makePlaceResponse({ pitch: 'A real dive.' })).pitch).toBe('A real dive.');
    });

    it('maps perfect', () => {
      expect(transformPlace(makePlaceResponse({ perfect: 'you want noise' })).perfect).toBe('you want noise');
    });

    it('maps insider', () => {
      expect(transformPlace(makePlaceResponse({ insider: 'sit at the bar' })).insider).toBe('sit at the bar');
    });

    it('maps crowd', () => {
      expect(transformPlace(makePlaceResponse({ crowd: 'locals' })).crowd).toBe('locals');
    });

    it('maps vibe', () => {
      expect(transformPlace(makePlaceResponse({ vibe: 'loud · dark' })).vibe).toBe('loud · dark');
    });

    it('sets signal to null', () => {
      expect(transformPlace(makePlaceResponse()).signal).toBeNull();
    });

    it('maps crowdLevel', () => {
      expect(transformPlace(makePlaceResponse({ crowd_level: 'Steady' })).crowdLevel).toBe('Steady');
    });

    it('maps priceTier', () => {
      expect(transformPlace(makePlaceResponse({ price_tier: '$$' })).priceTier).toBe('$$');
    });

    it('sets hours to null', () => {
      expect(transformPlace(makePlaceResponse()).hours).toBeNull();
    });

    it('maps hoursJson', () => {
      const hours_json = {
        periods: [],
        weekdayDescriptions: ['Sun: closed'],
      };
      expect(transformPlace(makePlaceResponse({ hours_json })).hoursJson).toBe(hours_json);
    });

    it('sets distance to null', () => {
      expect(transformPlace(makePlaceResponse()).distance).toBeNull();
    });

    it('sets closesIn to null', () => {
      expect(transformPlace(makePlaceResponse()).closesIn).toBeNull();
    });

    it('maps cross', () => {
      expect(transformPlace(makePlaceResponse({ cross_street: 'btwn A & B' })).cross).toBe('btwn A & B');
    });

    it('maps googlePriceLevel', () => {
      expect(transformPlace(makePlaceResponse({ google_price_level: 2 })).googlePriceLevel).toBe(2);
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

    it('does not use multi-line categories for mobile display', () => {
      const result = transformPlace(
        makePlaceResponse({ categories: 'Irish pub\nLive music\nCash only' }),
      );
      expect(result).not.toHaveProperty('kind');
    });
  });
});
