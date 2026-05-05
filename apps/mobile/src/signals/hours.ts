import { HoursJson, EVE_TIMEZONE } from '@eve/shared-types';

/** Extract day-of-week (0=Sunday), hour, and minute in Eastern Time */
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
      // Intl.DateTimeFormat with hour12:false can return 24 for midnight; normalize to 0
      if (hour === 24) hour = 0;
    } else if (part.type === 'minute') {
      minute = parseInt(part.value, 10);
    }
  }

  const day = weekdayMap[weekday] ?? 0;

  return { day, hour, minute };
}

/** Convert ET day/hour/minute components to a total-minutes-since-week-start value */
function toWeekMinutes(day: number, hour: number, minute: number): number {
  return day * 24 * 60 + hour * 60 + minute;
}

/**
 * Extracts periods for a given day of week (0=Sunday).
 * Handles periods where open.day matches but close.day might be next day (overnight).
 */
export function parseHoursForDay(
  hoursJson: HoursJson,
  day: number
): Array<{ open: { hour: number; minute: number }; close: { hour: number; minute: number } }> {
  const results: Array<{
    open: { hour: number; minute: number };
    close: { hour: number; minute: number };
  }> = [];

  for (const period of hoursJson.periods) {
    if (period.open.day === day) {
      results.push({
        open: { hour: period.open.hour, minute: period.open.minute },
        close: period.close
          ? { hour: period.close.hour, minute: period.close.minute }
          : { hour: 0, minute: 0 },
      });
    }
  }

  return results;
}

/**
 * Returns true if current ET time falls within any period for current ET day.
 * Handles overnight spans (e.g., open 6pm Tuesday, close 2am Wednesday).
 * Returns false if hoursJson is null.
 */
export function isOpenNow(hoursJson: HoursJson | null, now: Date): boolean {
  if (!hoursJson) return false;

  // 24-hour always-open check
  if (isAlwaysOpen(hoursJson)) return true;

  const { day, hour, minute } = getETComponents(now);
  const nowMinutes = toWeekMinutes(day, hour, minute);

  for (const period of hoursJson.periods) {
    const openMinutes = toWeekMinutes(period.open.day, period.open.hour, period.open.minute);

    if (!period.close) {
      // No close field — treat as open the entire day from the open time
      if (nowMinutes >= openMinutes) return true;
      continue;
    }

    const closeMinutes = toWeekMinutes(
      period.close.day,
      period.close.hour,
      period.close.minute
    );

    if (openMinutes <= closeMinutes) {
      // Normal (same-day or same-week) period
      if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) return true;
    } else {
      // Overnight: close is earlier in the week than open (e.g., open Tue 22:00, close Wed 02:00)
      if (nowMinutes >= openMinutes || nowMinutes < closeMinutes) return true;
    }
  }

  return false;
}

/**
 * Returns the next close time as a Date if currently open.
 * Returns null if closed or hours unknown.
 */
export function getClosingTime(hoursJson: HoursJson | null, now: Date): Date | null {
  if (!hoursJson) return null;
  if (isAlwaysOpen(hoursJson)) return null;

  const { day, hour, minute } = getETComponents(now);
  const nowMinutes = toWeekMinutes(day, hour, minute);

  for (const period of hoursJson.periods) {
    if (!period.close) continue;

    const openMinutes = toWeekMinutes(period.open.day, period.open.hour, period.open.minute);
    const closeMinutes = toWeekMinutes(
      period.close.day,
      period.close.hour,
      period.close.minute
    );

    let isWithinPeriod = false;

    if (openMinutes <= closeMinutes) {
      isWithinPeriod = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    } else {
      // Overnight period
      isWithinPeriod = nowMinutes >= openMinutes || nowMinutes < closeMinutes;
    }

    if (isWithinPeriod) {
      // Build close Date in ET by advancing from now
      let minutesUntilClose: number;

      if (openMinutes <= closeMinutes) {
        minutesUntilClose = closeMinutes - nowMinutes;
      } else {
        // Overnight: close is in the next calendar day (or later)
        if (nowMinutes >= openMinutes) {
          // We're on the open side — close is in the future (wraps past midnight)
          const weekTotalMinutes = 7 * 24 * 60;
          minutesUntilClose = (closeMinutes + weekTotalMinutes - nowMinutes) % weekTotalMinutes;
        } else {
          // We're on the close side (past midnight, before close)
          minutesUntilClose = closeMinutes - nowMinutes;
        }
      }

      return new Date(now.getTime() + minutesUntilClose * 60 * 1000);
    }
  }

  return null;
}

/**
 * Returns human-readable countdown to closing time.
 * Format: "7h 19m" (>1 hour), "45 min" (<1 hour), "12 min" (short).
 * Returns null if closingTime is null.
 */
export function formatClosesIn(closingTime: Date | null, now: Date): string | null {
  if (!closingTime) return null;

  const diffMs = closingTime.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }

  return `${totalMinutes} min`;
}

/**
 * Returns true if the place is always open (24/7).
 * Detects the Google 24h pattern: single period with open day=0, hour=0, minute=0,
 * and no close field (or close is also day=0 hour=0 minute=0).
 * Returns false when null.
 */
export function isAlwaysOpen(hoursJson: HoursJson | null): boolean {
  if (!hoursJson) return false;

  const { periods } = hoursJson;

  if (periods.length !== 1) return false;

  const period = periods[0];

  const openIsZero =
    period.open.day === 0 && period.open.hour === 0 && period.open.minute === 0;

  if (!openIsZero) return false;

  if (!period.close) return true;

  const closeIsZero =
    period.close.day === 0 && period.close.hour === 0 && period.close.minute === 0;

  return closeIsZero;
}
