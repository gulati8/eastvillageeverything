// Mock @eve/shared-types to avoid ESM .js extension resolution issues in Jest
// (index.ts uses `from './place.js'` which CommonJS Jest cannot resolve).
// The mock provides EVE_TIMEZONE so the modules under test work correctly.
jest.mock('@eve/shared-types', () => ({
  EVE_TIMEZONE: 'America/New_York',
}));

import type { HoursJson } from '@eve/shared-types';
import {
  isOpenNow,
  isAlwaysOpen,
  getClosingTime,
  formatClosesIn,
  parseHoursForDay,
} from '../hours';

// Key timezone facts used throughout:
// EDT (summer, May): UTC-4   →  ET = UTC - 4h
// EST (winter, Jan): UTC-5   →  ET = UTC - 5h
//
// 2026-05-04 is a Monday (verified).

// ---------------------------------------------------------------------------
// Helpers — HoursJson factories
// ---------------------------------------------------------------------------

function makeHours(
  periods: HoursJson['periods'],
  descriptions: string[] = []
): HoursJson {
  return { periods, weekdayDescriptions: descriptions };
}

/** Standard Mon–Sun 9am–5pm place */
const HOURS_9_TO_5: HoursJson = makeHours([
  { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } },
  { open: { day: 2, hour: 9, minute: 0 }, close: { day: 2, hour: 17, minute: 0 } },
  { open: { day: 3, hour: 9, minute: 0 }, close: { day: 3, hour: 17, minute: 0 } },
  { open: { day: 4, hour: 9, minute: 0 }, close: { day: 4, hour: 17, minute: 0 } },
  { open: { day: 5, hour: 9, minute: 0 }, close: { day: 5, hour: 17, minute: 0 } },
]);

/** Bar open Tue 6pm → Wed 2am (overnight) */
const HOURS_OVERNIGHT_BAR: HoursJson = makeHours([
  { open: { day: 2, hour: 18, minute: 0 }, close: { day: 3, hour: 2, minute: 0 } },
]);

/** Always-open (24/7) Google pattern */
const HOURS_ALWAYS_OPEN: HoursJson = makeHours([
  { open: { day: 0, hour: 0, minute: 0 } },
]);

/** Place closes at 10pm Monday */
const HOURS_CLOSE_10PM_MON: HoursJson = makeHours([
  { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 22, minute: 0 } },
]);

// ---------------------------------------------------------------------------
// isOpenNow
// ---------------------------------------------------------------------------

describe('isOpenNow', () => {
  // Test 1: standard open — Monday 2pm ET (EDT, UTC-4) = 18:00 UTC
  it('returns true when inside a standard period', () => {
    const now = new Date('2026-05-04T18:00:00Z'); // Mon 2pm ET
    expect(isOpenNow(HOURS_9_TO_5, now)).toBe(true);
  });

  // Test 2: standard closed — Monday 7pm ET = 23:00 UTC
  it('returns false when after closing time', () => {
    const now = new Date('2026-05-04T23:00:00Z'); // Mon 7pm ET
    expect(isOpenNow(HOURS_9_TO_5, now)).toBe(false);
  });

  // Test 3: overnight open — Wed 1:30am ET (EDT) = Wed 05:30 UTC
  it('returns true for overnight period at 1:30am ET (within span)', () => {
    const now = new Date('2026-05-06T05:30:00Z'); // Wed 1:30am ET
    expect(isOpenNow(HOURS_OVERNIGHT_BAR, now)).toBe(true);
  });

  // Test 4: overnight closed — Wed 3am ET = Wed 07:00 UTC (after 2am close)
  it('returns false for overnight period at 3am ET (past close)', () => {
    const now = new Date('2026-05-06T07:00:00Z'); // Wed 3am ET
    expect(isOpenNow(HOURS_OVERNIGHT_BAR, now)).toBe(false);
  });

  // Test 5: null hoursJson
  it('returns false when hoursJson is null', () => {
    const now = new Date('2026-05-04T18:00:00Z');
    expect(isOpenNow(null, now)).toBe(false);
  });

  // Test 6: empty periods
  it('returns false for empty periods array', () => {
    const empty = makeHours([]);
    const now = new Date('2026-05-04T18:00:00Z');
    expect(isOpenNow(empty, now)).toBe(false);
  });

  // Test 7: always-open returns true
  it('returns true for always-open (24/7) hours', () => {
    const now = new Date('2026-05-04T03:00:00Z'); // any time
    expect(isOpenNow(HOURS_ALWAYS_OPEN, now)).toBe(true);
  });

  // Test 8: before opening time on valid day
  it('returns false before opening time', () => {
    const now = new Date('2026-05-04T12:00:00Z'); // Mon 8am ET (before 9am open)
    expect(isOpenNow(HOURS_9_TO_5, now)).toBe(false);
  });

  // DST test: January (EST, UTC-5)
  // 2026-01-05 is a Monday. 18:00 UTC = 1pm ET (EST, -5) → place opens at 9am, so open.
  it('handles EST (winter) offset correctly — 1pm ET is within 9-5 window', () => {
    const now = new Date('2026-01-05T18:00:00Z'); // Mon 1pm ET (EST)
    expect(isOpenNow(HOURS_9_TO_5, now)).toBe(true);
  });

  // DST contrast: same UTC offset but summer (EDT, -4) puts us at 2pm ET → still open
  it('handles EDT (summer) offset correctly — 2pm ET is within 9-5 window', () => {
    const now = new Date('2026-05-04T18:00:00Z'); // Mon 2pm ET (EDT)
    expect(isOpenNow(HOURS_9_TO_5, now)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isAlwaysOpen
// ---------------------------------------------------------------------------

describe('isAlwaysOpen', () => {
  // Test 7: always-open true
  it('returns true for single period with open day=0 hour=0 minute=0, no close', () => {
    expect(isAlwaysOpen(HOURS_ALWAYS_OPEN)).toBe(true);
  });

  // Also true with close set to all-zeros
  it('returns true when close is also day=0 hour=0 minute=0', () => {
    const h = makeHours([
      {
        open: { day: 0, hour: 0, minute: 0 },
        close: { day: 0, hour: 0, minute: 0 },
      },
    ]);
    expect(isAlwaysOpen(h)).toBe(true);
  });

  // Test 8: normal periods return false
  it('returns false for normal operating hours', () => {
    expect(isAlwaysOpen(HOURS_9_TO_5)).toBe(false);
  });

  // Test 9: null returns false
  it('returns false when hoursJson is null', () => {
    expect(isAlwaysOpen(null)).toBe(false);
  });

  it('returns false when there are multiple periods', () => {
    expect(isAlwaysOpen(HOURS_OVERNIGHT_BAR)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getClosingTime
// ---------------------------------------------------------------------------

describe('getClosingTime', () => {
  // Test 10: when open, returns a Date roughly 3 hours away
  it('returns closing Date when currently open', () => {
    // Mon 2pm ET = 18:00 UTC; closes at 5pm ET (17:00 ET = 21:00 UTC)
    const now = new Date('2026-05-04T18:00:00Z'); // Mon 2pm ET
    const result = getClosingTime(HOURS_9_TO_5, now);
    expect(result).not.toBeNull();
    // 5pm ET = 21:00 UTC = now + 3h = now + 10800000ms
    expect(result!.getTime()).toBe(now.getTime() + 3 * 60 * 60 * 1000);
  });

  // Test 11: when closed, returns null
  it('returns null when currently closed', () => {
    const now = new Date('2026-05-04T23:00:00Z'); // Mon 7pm ET, past close
    const result = getClosingTime(HOURS_9_TO_5, now);
    expect(result).toBeNull();
  });

  it('returns null for null hoursJson', () => {
    expect(getClosingTime(null, new Date())).toBeNull();
  });

  it('returns null for always-open hours', () => {
    const now = new Date('2026-05-04T18:00:00Z');
    expect(getClosingTime(HOURS_ALWAYS_OPEN, now)).toBeNull();
  });

  it('returns correct closing time for overnight period (before close)', () => {
    // Wed 1:30am ET = 05:30 UTC; closes at 2am ET (06:00 UTC)
    const now = new Date('2026-05-06T05:30:00Z'); // Wed 1:30am ET
    const result = getClosingTime(HOURS_OVERNIGHT_BAR, now);
    expect(result).not.toBeNull();
    // 30 minutes to close
    expect(result!.getTime()).toBe(now.getTime() + 30 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// formatClosesIn
// ---------------------------------------------------------------------------

describe('formatClosesIn', () => {
  const base = new Date('2026-05-04T18:00:00Z');

  // Test 12: >1 hour remaining → "3h 15m"
  it('formats as Xh Ym when more than 1 hour remains', () => {
    const closing = new Date(base.getTime() + (3 * 60 + 15) * 60 * 1000);
    expect(formatClosesIn(closing, base)).toBe('3h 15m');
  });

  // Another >1h case: exactly 1h 0m
  it('formats as 1h 0m when exactly 1 hour remains', () => {
    const closing = new Date(base.getTime() + 60 * 60 * 1000);
    expect(formatClosesIn(closing, base)).toBe('1h 0m');
  });

  // Test 13: <1 hour remaining → "45 min"
  it('formats as X min when less than 1 hour remains', () => {
    const closing = new Date(base.getTime() + 45 * 60 * 1000);
    expect(formatClosesIn(closing, base)).toBe('45 min');
  });

  it('formats as X min for short durations', () => {
    const closing = new Date(base.getTime() + 12 * 60 * 1000);
    expect(formatClosesIn(closing, base)).toBe('12 min');
  });

  // Test 14: null closingTime → null
  it('returns null when closingTime is null', () => {
    expect(formatClosesIn(null, base)).toBeNull();
  });

  it('returns null when closing time is in the past', () => {
    const past = new Date(base.getTime() - 60 * 1000);
    expect(formatClosesIn(past, base)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseHoursForDay
// ---------------------------------------------------------------------------

describe('parseHoursForDay', () => {
  it('returns periods matching the requested day', () => {
    const result = parseHoursForDay(HOURS_9_TO_5, 1); // Monday
    expect(result).toHaveLength(1);
    expect(result[0].open).toEqual({ hour: 9, minute: 0 });
    expect(result[0].close).toEqual({ hour: 17, minute: 0 });
  });

  it('returns empty array for a day with no periods', () => {
    const result = parseHoursForDay(HOURS_9_TO_5, 0); // Sunday
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Timezone conversion test (Test 15)
// ---------------------------------------------------------------------------

describe('Timezone conversion', () => {
  // UTC midnight (00:00 UTC) on a Wednesday in summer (EDT, UTC-4)
  // 2026-05-06 00:00 UTC = Tuesday 8pm ET (day=2, hour=20)
  // We validate this via isOpenNow: if we have a place open Tue 8pm–9pm,
  // it should be open at this moment.
  it('UTC midnight Wednesday in EDT resolves to Tuesday 8pm ET', () => {
    const now = new Date('2026-05-06T00:00:00Z'); // Wed 00:00 UTC = Tue 8pm ET
    // Place open Tuesday 8pm–9pm
    const tueSplit: HoursJson = makeHours([
      { open: { day: 2, hour: 20, minute: 0 }, close: { day: 2, hour: 21, minute: 0 } },
    ]);
    expect(isOpenNow(tueSplit, now)).toBe(true);
  });

  // Contrast: EST (winter) — UTC midnight on a Wednesday
  // 2026-01-07 is Wednesday. 00:00 UTC = Tue 7pm ET (EST, UTC-5)
  it('UTC midnight Wednesday in EST resolves to Tuesday 7pm ET', () => {
    const now = new Date('2026-01-07T00:00:00Z'); // Wed 00:00 UTC = Tue 7pm ET
    // Place open Tuesday 7pm–8pm
    const tueSplit: HoursJson = makeHours([
      { open: { day: 2, hour: 19, minute: 0 }, close: { day: 2, hour: 20, minute: 0 } },
    ]);
    expect(isOpenNow(tueSplit, now)).toBe(true);
  });
});
