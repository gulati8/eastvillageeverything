// Mock @eve/shared-types to avoid ESM .js extension resolution issues in Jest
// (index.ts uses `from './place.js'` which CommonJS Jest cannot resolve).
// The mock provides EVE_TIMEZONE so the modules under test work correctly.
jest.mock('@eve/shared-types', () => ({
  EVE_TIMEZONE: 'America/New_York',
}));

import type { PlaceResponse, HoursJson } from '@eve/shared-types';
import { computeSignal, parseHappyHour } from '../signal';

// ---------------------------------------------------------------------------
// Timezone notes (EDT, summer/May, UTC-4):
//   2026-05-04 is a Monday.
//   4:30pm ET Mon  = 20:30 UTC  → 2026-05-04T20:30:00Z
//   6:15pm ET Mon  = 22:15 UTC  → 2026-05-04T22:15:00Z
//   9:30pm ET Mon  = 01:30 UTC Tue → 2026-05-05T01:30:00Z
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function makeHours(
  periods: HoursJson['periods'],
  descriptions: string[] = []
): HoursJson {
  return { periods, weekdayDescriptions: descriptions };
}

function makePlaceResponse(overrides: Partial<PlaceResponse> = {}): PlaceResponse {
  return {
    key: 'test-id',
    name: 'Test Place',
    address: '123 E 7th St',
    phone: null,
    url: null,
    specials: null,
    categories: null,
    notes: null,
    tags: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Mon 9am–10pm hours (open all day Monday for closing-soon tests) */
const HOURS_MON_9_22: HoursJson = makeHours([
  { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } },
]);

/** Always-open 24/7 Google pattern */
const HOURS_ALWAYS: HoursJson = makeHours([
  { open: { day: 0, hour: 0, minute: 0 } },
]);

// ---------------------------------------------------------------------------
// computeSignal — happy hour
// ---------------------------------------------------------------------------

describe('computeSignal — happy hour', () => {
  // Test 1: Happy hour active >60min remaining
  it('returns kind=happy, urgent=false when >60min of happy hour remains', () => {
    // Happy hour 4pm–7pm; now = 4:30pm ET Mon
    const now = new Date('2026-05-04T20:30:00Z'); // Mon 4:30pm ET
    const place = makePlaceResponse({ specials: 'Happy Hour 4-7pm' });
    const result = computeSignal(place, now);
    expect(result.kind).toBe('happy');
    expect(result.urgent).toBe(false);
    expect(result.label).toContain('Happy hour');
  });

  // Test 2: Happy hour urgent — <60min remaining
  it('returns kind=happy, urgent=true when <60min of happy hour remains', () => {
    // Happy hour 4pm–7pm; now = 6:15pm ET Mon (45min left)
    const now = new Date('2026-05-04T22:15:00Z'); // Mon 6:15pm ET
    const place = makePlaceResponse({ specials: 'Happy Hour 4-7pm' });
    const result = computeSignal(place, now);
    expect(result.kind).toBe('happy');
    expect(result.urgent).toBe(true);
  });

  // Test 13: Priority — happy hour wins over closing soon
  it('happy hour takes priority over closing soon when both apply', () => {
    // Happy hour 4pm–7pm; closes at 7pm; now = 6:30pm ET (30min left for both)
    const HOURS_MON_9_19: HoursJson = makeHours([
      { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 19, minute: 0 } },
    ]);
    const now = new Date('2026-05-04T22:30:00Z'); // Mon 6:30pm ET
    const place = makePlaceResponse({
      specials: 'Happy Hour 4-7pm',
      hours_json: HOURS_MON_9_19,
    });
    const result = computeSignal(place, now);
    // Happy hour has priority in the cascade
    expect(result.kind).toBe('happy');
  });
});

// ---------------------------------------------------------------------------
// computeSignal — closing soon
// ---------------------------------------------------------------------------

describe('computeSignal — closing soon', () => {
  // Test 3: Closing soon — urgent
  it('returns kind=closing, urgent=true when closing within 60min', () => {
    // Closes 10pm Mon; now = 9:30pm ET Mon = 01:30 UTC Tue
    const now = new Date('2026-05-05T01:30:00Z'); // Mon 9:30pm ET
    const place = makePlaceResponse({ hours_json: HOURS_MON_9_22 });
    const result = computeSignal(place, now);
    expect(result.kind).toBe('closing');
    expect(result.urgent).toBe(true);
    expect(result.label).toContain('Closes in');
  });

  it('returns kind=null (not closing soon) when >60min until close', () => {
    // Closes 10pm Mon; now = 2pm ET Mon = 18:00 UTC
    const now = new Date('2026-05-04T18:00:00Z'); // Mon 2pm ET
    const place = makePlaceResponse({ hours_json: HOURS_MON_9_22 });
    const result = computeSignal(place, now);
    // 8 hours to close — not closing soon, no other signals
    expect(result.kind).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeSignal — always open
// ---------------------------------------------------------------------------

describe('computeSignal — always open', () => {
  // Test 4: Always open
  it('returns kind=always, label=Open 24h for 24/7 hours', () => {
    const now = new Date('2026-05-04T18:00:00Z');
    const place = makePlaceResponse({ hours_json: HOURS_ALWAYS });
    const result = computeSignal(place, now);
    expect(result.kind).toBe('always');
    expect(result.label).toBe('Open 24h');
    expect(result.urgent).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeSignal — walk-ins
// ---------------------------------------------------------------------------

describe('computeSignal — walk-ins', () => {
  // Test 5: Walk-in from tags
  it('returns kind=walkin when tags contain walk-ins', () => {
    const now = new Date('2026-05-04T18:00:00Z');
    const place = makePlaceResponse({ tags: ['walk-ins'] });
    const result = computeSignal(place, now);
    expect(result.kind).toBe('walkin');
    expect(result.label).toBe('Walk-ins welcome');
  });

  // Test 6: Walk-in from specials text
  it('returns kind=walkin when specials contains walk-in', () => {
    const now = new Date('2026-05-04T18:00:00Z');
    const place = makePlaceResponse({ specials: 'Walk-in friendly, no reservation needed' });
    const result = computeSignal(place, now);
    expect(result.kind).toBe('walkin');
  });
});

// ---------------------------------------------------------------------------
// computeSignal — no signal
// ---------------------------------------------------------------------------

describe('computeSignal — no signal', () => {
  // Test 7: No signal
  it('returns kind=null with no hours, no specials, empty tags', () => {
    const now = new Date('2026-05-04T18:00:00Z');
    const place = makePlaceResponse();
    const result = computeSignal(place, now);
    expect(result.kind).toBeNull();
    expect(result.urgent).toBe(false);
    expect(result.label).toBeNull();
  });

  // Test 8: Null hours_json, no other signals
  it('returns kind=null for null hours_json with no other signals', () => {
    const now = new Date('2026-05-04T18:00:00Z');
    const place = makePlaceResponse({ hours_json: null });
    const result = computeSignal(place, now);
    expect(result.kind).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseHappyHour
// ---------------------------------------------------------------------------

describe('parseHappyHour', () => {
  // Test 9: 'happy hour 4-7'
  it('parses "happy hour 4-7" as 4pm–7pm daily', () => {
    const results = parseHappyHour('happy hour 4-7');
    expect(results.length).toBeGreaterThan(0);
    // daily = all 7 days
    const monday = results.find((p) => p.day === 1);
    expect(monday).toBeDefined();
    expect(monday!.start.hour).toBe(16); // 4pm
    expect(monday!.end.hour).toBe(19);   // 7pm
  });

  // Test 10: 'HH 4pm-7pm'
  it('parses "HH 4pm-7pm" correctly', () => {
    const results = parseHappyHour('HH 4pm-7pm');
    expect(results.length).toBeGreaterThan(0);
    const monday = results.find((p) => p.day === 1);
    expect(monday).toBeDefined();
    expect(monday!.start.hour).toBe(16);
    expect(monday!.end.hour).toBe(19);
  });

  // Test 11: null returns empty array
  it('returns empty array for null', () => {
    expect(parseHappyHour(null)).toEqual([]);
  });

  // Test 12: unparseable returns empty array
  it('returns empty array for unparseable string', () => {
    expect(parseHappyHour('No specials today')).toEqual([]);
  });

  it('parses "Happy Hour Mon-Fri 4-7pm" and produces only weekday entries', () => {
    const results = parseHappyHour('Happy Hour Mon-Fri 4-7pm');
    const days = results.map((p) => p.day);
    // Mon=1 through Fri=5, no Sat/Sun
    expect(days).toContain(1);
    expect(days).toContain(5);
    expect(days).not.toContain(0); // Sun
    expect(days).not.toContain(6); // Sat
  });

  it('parses "happy hour daily 4:00-7:00" with 7 day entries', () => {
    const results = parseHappyHour('happy hour daily 4:00-7:00');
    expect(results).toHaveLength(7);
    expect(results[0].start.hour).toBe(16);
    expect(results[0].end.hour).toBe(19);
  });
});
