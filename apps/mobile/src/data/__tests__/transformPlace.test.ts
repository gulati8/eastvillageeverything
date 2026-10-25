// Mock @eve/shared-types to avoid ESM .js extension resolution issues in Jest
// (index.ts uses `from './place.js'` which CommonJS Jest cannot resolve).
// transformPlace pulls in signals/hours, which reads EVE_TIMEZONE at runtime.
jest.mock('@eve/shared-types', () => ({
  EVE_TIMEZONE: 'America/New_York',
}));

import type { HoursJson, PlaceDetailResponse, PlaceResponse } from '@eve/shared-types';
import { todayHoursLabel, transformPlace } from '../transformPlace';

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

    it('maps photo_attribution (detail response) to photoAttribution', () => {
      const detail: PlaceDetailResponse = { ...makePlaceResponse(), photo_attribution: 'Jane Doe' };
      expect(transformPlace(detail).photoAttribution).toBe('Jane Doe');
    });

    it('sets photoAttribution to null when the field is null, blank, or absent (list row)', () => {
      expect(transformPlace({ ...makePlaceResponse(), photo_attribution: null }).photoAttribution).toBeNull();
      expect(transformPlace({ ...makePlaceResponse(), photo_attribution: '  ' }).photoAttribution).toBeNull();
      expect(transformPlace(makePlaceResponse()).photoAttribution).toBeNull();
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

  describe('sized photos (photoThumb / photoHero fallback order)', () => {
    const original = 'https://img.example.com/p.png';
    const thumb = 'https://img.example.com/p.thumb.jpg';
    const hero = 'https://img.example.com/p.hero.jpg';

    it('uses the sized variant when all three URLs are present', () => {
      const result = transformPlace(
        makePlaceResponse({ photo_url: original, photo_thumb_url: thumb, photo_hero_url: hero }),
      );
      expect(result.photo).toBe(original);
      expect(result.photoThumb).toBe(thumb);
      expect(result.photoHero).toBe(hero);
    });

    it('falls back to photo_url when the sized variants are null', () => {
      const result = transformPlace(
        makePlaceResponse({ photo_url: original, photo_thumb_url: null, photo_hero_url: null }),
      );
      expect(result.photoThumb).toBe(original);
      expect(result.photoHero).toBe(original);
    });

    it('falls back to photo_url when the sized variants are absent (older API / cached rows)', () => {
      const result = transformPlace(makePlaceResponse({ photo_url: original }));
      expect(result.photoThumb).toBe(original);
      expect(result.photoHero).toBe(original);
    });

    it('falls back to photo_url when a sized variant is an empty string', () => {
      const result = transformPlace(
        makePlaceResponse({ photo_url: original, photo_thumb_url: '', photo_hero_url: '   ' }),
      );
      expect(result.photoThumb).toBe(original);
      expect(result.photoHero).toBe(original);
    });

    it('falls back independently per size', () => {
      const result = transformPlace(
        makePlaceResponse({ photo_url: original, photo_thumb_url: thumb, photo_hero_url: null }),
      );
      expect(result.photoThumb).toBe(thumb);
      expect(result.photoHero).toBe(original);
    });

    it('is null for every size when there is no photo at all, so PhotoFallback renders', () => {
      const result = transformPlace(
        makePlaceResponse({ photo_url: null, photo_thumb_url: null, photo_hero_url: null }),
      );
      expect(result.photo).toBeNull();
      expect(result.photoThumb).toBeNull();
      expect(result.photoHero).toBeNull();
    });

    it('does not promote a sized variant to photo (the original)', () => {
      const result = transformPlace(
        makePlaceResponse({ photo_url: null, photo_thumb_url: thumb, photo_hero_url: hero }),
      );
      expect(result.photo).toBeNull();
      expect(result.photoThumb).toBe(thumb);
      expect(result.photoHero).toBe(hero);
    });
  });

  // -------------------------------------------------------------------------
  // Shapes the public API actually serves after the Google Places enrichment
  // run (scripts/enrich-places.ts). Fixtures are copied from
  // GET https://eastvillageeverything.nyc/api/places on 2026-10-24.
  // -------------------------------------------------------------------------

  describe('enrichment shapes from the public API', () => {
    /** 11th Street Bar: enriched, open every day, overnight closes. */
    const sevenDayHours: HoursJson = {
      periods: [
        { open: { day: 0, hour: 12, minute: 0 }, close: { day: 1, hour: 4, minute: 0 } },
        { open: { day: 1, hour: 14, minute: 0 }, close: { day: 2, hour: 4, minute: 0 } },
        { open: { day: 2, hour: 14, minute: 0 }, close: { day: 3, hour: 4, minute: 0 } },
        { open: { day: 3, hour: 14, minute: 0 }, close: { day: 4, hour: 4, minute: 0 } },
        { open: { day: 4, hour: 14, minute: 0 }, close: { day: 5, hour: 4, minute: 0 } },
        { open: { day: 5, hour: 14, minute: 0 }, close: { day: 6, hour: 4, minute: 0 } },
        { open: { day: 6, hour: 12, minute: 0 }, close: { day: 0, hour: 4, minute: 0 } },
      ],
      weekdayDescriptions: [
        'Monday: 2:00 PM – 4:00 AM',
        'Tuesday: 2:00 PM – 4:00 AM',
        'Wednesday: 2:00 PM – 4:00 AM',
        'Thursday: 2:00 PM – 4:00 AM',
        'Friday: 2:00 PM – 4:00 AM',
        'Saturday: 12:00 PM – 4:00 AM',
        'Sunday: 12:00 PM – 4:00 AM',
      ],
    };

    /** 310 Bowery Bar: enriched, closed Mondays, so only six periods. */
    const sixDayHours: HoursJson = {
      periods: [
        { open: { day: 0, hour: 12, minute: 0 }, close: { day: 1, hour: 0, minute: 0 } },
        { open: { day: 2, hour: 17, minute: 0 }, close: { day: 3, hour: 0, minute: 0 } },
        { open: { day: 3, hour: 17, minute: 0 }, close: { day: 4, hour: 1, minute: 0 } },
        { open: { day: 4, hour: 17, minute: 0 }, close: { day: 5, hour: 2, minute: 0 } },
        { open: { day: 5, hour: 17, minute: 0 }, close: { day: 6, hour: 4, minute: 0 } },
        { open: { day: 6, hour: 11, minute: 30 }, close: { day: 0, hour: 4, minute: 0 } },
      ],
      weekdayDescriptions: [
        'Monday: Closed',
        'Tuesday: 5:00 PM – 12:00 AM',
        'Wednesday: 5:00 PM – 1:00 AM',
        'Thursday: 5:00 PM – 2:00 AM',
        'Friday: 5:00 PM – 4:00 AM',
        'Saturday: 11:30 AM – 4:00 AM',
        'Sunday: 12:00 PM – 12:00 AM',
      ],
    };

    /** The list endpoint row for 11th Street Bar (enrichment_status = ok). */
    const enrichedRow = makePlaceResponse({
      key: '2498bf36-7de6-4f87-8029-4570ef7288ef',
      name: '11th Street Bar',
      address: '510 E 11th St',
      lat: 40.7280546,
      lng: -73.9812525,
      hours_json: sevenDayHours,
      google_price_level: null,
    });

    /** 13th step: resolved a Google place (lat/lng written) but Google has no hours for it. */
    const enrichedRowWithoutHours = makePlaceResponse({
      name: '13th step  ( See the 13th Step)',
      address: '',
      lat: 40.7294796,
      lng: -73.9872714,
      hours_json: null,
    });

    /** Queen Vic: Text Search found nothing, so every enrichment column is null. */
    const failedRow = makePlaceResponse({
      name: 'Queen Vic',
      address: '68 2nd Ave',
      lat: null,
      lng: null,
      hours_json: null,
      google_place_id: null,
      google_price_level: null,
      enrichment_status: 'failed',
      enriched_at: null,
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('enriched row: keeps numeric coordinates and the hours object', () => {
      const result = transformPlace(enrichedRow);
      expect(result.lat).toBe(40.7280546);
      expect(result.lng).toBe(-73.9812525);
      expect(result.hoursJson).toBe(sevenDayHours);
      expect(result.hours).toEqual({ openNow: null, label: expect.any(String) });
    });

    it('enriched row without hours: coordinates present, hours and hoursJson null', () => {
      const result = transformPlace(enrichedRowWithoutHours);
      expect(result.lat).toBe(40.7294796);
      expect(result.lng).toBe(-73.9872714);
      expect(result.hours).toBeNull();
      expect(result.hoursJson).toBeNull();
    });

    it('failed row: coordinates, hours and hoursJson are all null and nothing throws', () => {
      expect(() => transformPlace(failedRow)).not.toThrow();
      const result = transformPlace(failedRow);
      expect(result.lat).toBeNull();
      expect(result.lng).toBeNull();
      expect(result.hours).toBeNull();
      expect(result.hoursJson).toBeNull();
      expect(result.googlePriceLevel).toBeNull();
    });

    it('hours.label is today\'s line, with Google\'s Monday-first weekdayDescriptions', () => {
      // Monday 2026-10-26, 2:00 PM Eastern.
      jest.useFakeTimers({ now: new Date('2026-10-26T18:00:00Z') });
      expect(transformPlace(enrichedRow).hours?.label).toBe('Monday: 2:00 PM – 4:00 AM');
    });

    it('todayHoursLabel maps every weekday to the matching description', () => {
      // 2026-10-25 is a Sunday; each step is 24h, 2:00 PM Eastern (EDT, UTC-4).
      const sunday = Date.UTC(2026, 9, 25, 18, 0, 0);
      const expected = [
        'Sunday: 12:00 PM – 4:00 AM',
        'Monday: 2:00 PM – 4:00 AM',
        'Tuesday: 2:00 PM – 4:00 AM',
        'Wednesday: 2:00 PM – 4:00 AM',
        'Thursday: 2:00 PM – 4:00 AM',
        'Friday: 2:00 PM – 4:00 AM',
        'Saturday: 12:00 PM – 4:00 AM',
      ];
      expected.forEach((label, offset) => {
        const now = new Date(sunday + offset * 24 * 60 * 60 * 1000);
        expect(todayHoursLabel(sevenDayHours, now)).toBe(label);
      });
    });

    it('todayHoursLabel uses the Eastern Time day, not the UTC day', () => {
      // 02:00 UTC on Tuesday 2026-10-27 is still 10:00 PM Monday in New York.
      const now = new Date('2026-10-27T02:00:00Z');
      expect(todayHoursLabel(sevenDayHours, now)).toBe('Monday: 2:00 PM – 4:00 AM');
    });

    it('todayHoursLabel still works when a day has no period (closed Mondays)', () => {
      const monday = new Date('2026-10-26T18:00:00Z');
      expect(todayHoursLabel(sixDayHours, monday)).toBe('Monday: Closed');
      const tuesday = new Date('2026-10-27T18:00:00Z');
      expect(todayHoursLabel(sixDayHours, tuesday)).toBe('Tuesday: 5:00 PM – 12:00 AM');
    });

    it('todayHoursLabel is null for null hours or empty descriptions', () => {
      expect(todayHoursLabel(null)).toBeNull();
      expect(todayHoursLabel({ periods: [], weekdayDescriptions: [] })).toBeNull();
    });
  });
});
