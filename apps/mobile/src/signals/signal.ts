import { PlaceResponse, EVE_TIMEZONE } from '@eve/shared-types';
import { isOpenNow, getClosingTime, isAlwaysOpen } from './hours';

export type SignalKind = 'happy' | 'closing' | 'music' | 'always' | 'walkin';

export interface SignalResult {
  kind: SignalKind | null;
  urgent: boolean;
  label: string | null;
}

/** ET components for a given Date, mirroring the private helper in hours.ts */
function getETComponents(date: Date): { day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EVE_TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  let weekday = '';
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === 'weekday') {
      weekday = part.value;
    } else if (part.type === 'hour') {
      hour = parseInt(part.value, 10);
      if (hour === 24) hour = 0;
    } else if (part.type === 'minute') {
      minute = parseInt(part.value, 10);
    }
  }

  const day = weekdayMap[weekday] ?? 0;
  return { day, hour, minute };
}

/** Normalize a 12-hour-style number to 24-hour, given optional am/pm hint */
function to24Hour(h: number, suffix: string): number {
  const lower = suffix.toLowerCase();
  if (lower.includes('pm') && h < 12) return h + 12;
  if (lower.includes('am') && h === 12) return 0;
  // No suffix — apply a heuristic: treat 1-11 as PM if in happy-hour range
  if (!lower.includes('am') && !lower.includes('pm')) {
    if (h >= 1 && h <= 11) return h + 12;
  }
  return h;
}

interface HappyHourPeriod {
  day: number;
  start: { hour: number; minute: number };
  end: { hour: number; minute: number };
}

/**
 * Best-effort regex parser for free-text specials fields.
 * Handles:
 *   'happy hour 4-7'
 *   'HH 4pm-7pm'
 *   'Happy Hour Mon-Fri 4-7pm'
 *   'happy hour daily 4:00-7:00'
 *   Multiline specials with multiple entries
 */
export function parseHappyHour(specials: string | null): HappyHourPeriod[] {
  if (!specials) return [];

  const DAY_RANGES: Record<string, number[]> = {
    daily: [0, 1, 2, 3, 4, 5, 6],
    'mon-fri': [1, 2, 3, 4, 5],
    'mon-sat': [1, 2, 3, 4, 5, 6],
    'mon-sun': [0, 1, 2, 3, 4, 5, 6],
    'tue-sat': [2, 3, 4, 5, 6],
    'wed-sat': [3, 4, 5, 6],
    mon: [1],
    tue: [2],
    wed: [3],
    thu: [4],
    fri: [5],
    sat: [6],
    sun: [0],
  };

  const results: HappyHourPeriod[] = [];

  // Match "happy hour" or "HH" (case-insensitive) followed by optional day info and a time range
  // Pattern: (happy hour|hh)\s+(day-spec\s+)?start(-end)?(am|pm)?
  const HAPPY_HOUR_PATTERN =
    /(?:happy\s+hour|hh)\s+([a-z]+-[a-z]+|daily|mon|tue|wed|thu|fri|sat|sun)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;

  let match: RegExpExecArray | null;

  while ((match = HAPPY_HOUR_PATTERN.exec(specials)) !== null) {
    const [
      ,
      daySpec,
      startHourStr,
      startMinStr,
      startSuffix,
      endHourStr,
      endMinStr,
      endSuffix,
    ] = match;

    const startHourRaw = parseInt(startHourStr, 10);
    const startMin = startMinStr ? parseInt(startMinStr, 10) : 0;
    const endHourRaw = parseInt(endHourStr, 10);
    const endMin = endMinStr ? parseInt(endMinStr, 10) : 0;

    // Determine AM/PM: use explicit suffix; if end has pm and start doesn't, apply pm to both
    const effectiveEndSuffix = endSuffix ?? '';
    const effectiveStartSuffix = startSuffix ?? (endSuffix ?? '');

    const startHour = to24Hour(startHourRaw, effectiveStartSuffix);
    const endHour = to24Hour(endHourRaw, effectiveEndSuffix);

    // Determine which days
    const dayKey = daySpec ? daySpec.toLowerCase() : 'daily';
    const days = DAY_RANGES[dayKey] ?? DAY_RANGES['daily'];

    for (const day of days) {
      results.push({
        day,
        start: { hour: startHour, minute: startMin },
        end: { hour: endHour, minute: endMin },
      });
    }
  }

  return results;
}

/** Parse a simple "X PM" or "X:YY PM" time string from specials text, returning hours/minutes (24h) */
function parseMusicTime(text: string): { hour: number; minute: number } | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(text);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = m[3].toLowerCase();
  if (suffix === 'pm' && h < 12) h += 12;
  if (suffix === 'am' && h === 12) h = 0;
  return { hour: h, minute: min };
}

/** Format hour/minute as "X PM" or "X:YY PM" */
function formatTime(hour: number, minute: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  if (minute === 0) return `${h} ${suffix}`;
  return `${h}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * Compute the contextual signal for a place at a given moment.
 * Implements priority cascade: happy hour > closing soon > music > always open > walk-ins > null.
 * Pure function — no Date.now(), no side effects.
 */
export function computeSignal(place: PlaceResponse, now: Date): SignalResult {
  const NO_SIGNAL: SignalResult = { kind: null, urgent: false, label: null };

  const hoursJson = place.hours_json ?? null;
  const specials = place.specials ?? null;

  // --- 1. Happy hour ---
  const happyPeriods = parseHappyHour(specials);
  if (happyPeriods.length > 0) {
    const { day, hour, minute } = getETComponents(now);
    const nowTotalMinutes = day * 24 * 60 + hour * 60 + minute;

    for (const period of happyPeriods) {
      if (period.day !== day) continue;

      const startTotal = period.day * 24 * 60 + period.start.hour * 60 + period.start.minute;
      const endTotal = period.day * 24 * 60 + period.end.hour * 60 + period.end.minute;

      if (nowTotalMinutes >= startTotal && nowTotalMinutes < endTotal) {
        const remainingMinutes = endTotal - nowTotalMinutes;
        const urgent = remainingMinutes < 60;
        let label: string;

        if (remainingMinutes >= 60) {
          const h = Math.floor(remainingMinutes / 60);
          const m = remainingMinutes % 60;
          label = `Happy hour -- ${h}h ${m}m left`;
        } else {
          label = `Happy hour -- ${remainingMinutes}m left`;
        }

        return { kind: 'happy', urgent, label };
      }
    }
  }

  // --- 2. Closing soon ---
  if (isOpenNow(hoursJson, now)) {
    const closingTime = getClosingTime(hoursJson, now);
    if (closingTime !== null) {
      const diffMs = closingTime.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (60 * 1000));
      if (diffMinutes <= 60 && diffMinutes > 0) {
        return {
          kind: 'closing',
          urgent: true,
          label: `Closes in ${diffMinutes}m`,
        };
      }
    }
  }

  // --- 3. Live music / event within 4 hours ---
  if (specials) {
    const lowerSpecials = specials.toLowerCase();
    if (lowerSpecials.includes('live music')) {
      // Find "live music at X PM" or "live music X PM" patterns
      const musicPattern = /live\s+music\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi;
      let mMatch: RegExpExecArray | null;
      while ((mMatch = musicPattern.exec(specials)) !== null) {
        const timeStr = mMatch[1];
        const parsed = parseMusicTime(timeStr);
        if (parsed) {
          const { day, hour, minute } = getETComponents(now);
          const nowTotalMinutes = day * 24 * 60 + hour * 60 + minute;
          const eventTotal = day * 24 * 60 + parsed.hour * 60 + parsed.minute;
          const diffMinutes = eventTotal - nowTotalMinutes;
          // Upcoming within 4 hours
          if (diffMinutes >= 0 && diffMinutes <= 240) {
            return {
              kind: 'music',
              urgent: false,
              label: `Live music at ${formatTime(parsed.hour, parsed.minute)}`,
            };
          }
        }
      }
    }
  }

  // --- 4. Always open ---
  if (isAlwaysOpen(hoursJson)) {
    return { kind: 'always', urgent: false, label: 'Open 24h' };
  }

  // --- 5. Walk-ins welcome ---
  const tagsLower = place.tags.map((t) => t.toLowerCase());
  const specialsLower = specials ? specials.toLowerCase() : '';
  if (tagsLower.includes('walk-ins') || specialsLower.includes('walk-in')) {
    return { kind: 'walkin', urgent: false, label: 'Walk-ins welcome' };
  }

  // --- 6. No signal ---
  return NO_SIGNAL;
}
