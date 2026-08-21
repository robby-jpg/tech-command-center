/**
 * Business-time arithmetic.
 *
 * SLA targets are stated in business hours and business days — "4 business
 * hours", "3 business days". Measuring those against wall-clock elapsed time
 * is wrong in a way that matters: a ticket raised at 4pm on Friday and
 * resolved at 9am on Monday consumed one business hour, not sixty-five. A
 * dashboard that cannot tell those apart reports weekends as failures.
 *
 * The working week is Monday to Friday, 09:00–17:00 Mountain Time.
 *
 * Simplification worth knowing about: the offset is fixed at UTC−6 (Mountain
 * Daylight Time) rather than resolved through a timezone database, and public
 * holidays are not modelled. Both are fine for the seeded dataset, which sits
 * in August; a production implementation would take the offset and a holiday
 * calendar from configuration. Everything else here is exact.
 */

/**
 * Kind Home operates out of Colorado. Every date the application formats or
 * reasons about is resolved in this zone, so that a server running in UTC and a
 * browser in Denver agree on what day — and what quarter — an instant falls in.
 */
export const COMPANY_TIME_ZONE = "America/Denver";

const MT_OFFSET_HOURS = -6;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 17;

/** Calendar year and month (1–12) for an instant, in company time. */
export function companyYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: COMPANY_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? "0"),
    month: Number(parts.find((p) => p.type === "month")?.value ?? "1"),
  };
}

export const BUSINESS_MINUTES_PER_DAY = (DAY_END_HOUR - DAY_START_HOUR) * 60;

/** Local Mountain-Time wall clock for an instant, expressed as UTC parts. */
function toLocal(date: Date): Date {
  return new Date(date.getTime() + MT_OFFSET_HOURS * 3_600_000);
}

function fromLocal(local: Date): Date {
  return new Date(local.getTime() - MT_OFFSET_HOURS * 3_600_000);
}

function isWeekend(local: Date): boolean {
  const day = local.getUTCDay();
  return day === 0 || day === 6;
}

function startOfBusinessDay(local: Date): Date {
  const d = new Date(local);
  d.setUTCHours(DAY_START_HOUR, 0, 0, 0);
  return d;
}

function endOfBusinessDay(local: Date): Date {
  const d = new Date(local);
  d.setUTCHours(DAY_END_HOUR, 0, 0, 0);
  return d;
}

/** Moves a local time forward to the next instant inside working hours. */
function nextBusinessInstant(local: Date): Date {
  let cursor = new Date(local);

  for (let guard = 0; guard < 14; guard++) {
    if (isWeekend(cursor)) {
      cursor = startOfBusinessDay(
        new Date(cursor.getTime() + 86_400_000),
      );
      continue;
    }
    if (cursor < startOfBusinessDay(cursor)) return startOfBusinessDay(cursor);
    if (cursor >= endOfBusinessDay(cursor)) {
      cursor = startOfBusinessDay(new Date(cursor.getTime() + 86_400_000));
      continue;
    }
    return cursor;
  }
  return cursor;
}

/** Business minutes elapsed between two instants. Never negative. */
export function businessMinutesBetween(from: Date, to: Date): number {
  if (to <= from) return 0;

  let cursor = nextBusinessInstant(toLocal(from));
  const end = toLocal(to);
  let minutes = 0;

  // Bounded so a bad input can never spin: a year of working days is plenty.
  for (let guard = 0; guard < 400 && cursor < end; guard++) {
    const dayEnd = endOfBusinessDay(cursor);
    const segmentEnd = end < dayEnd ? end : dayEnd;
    minutes += Math.max(0, (segmentEnd.getTime() - cursor.getTime()) / 60_000);
    cursor = nextBusinessInstant(new Date(dayEnd.getTime() + 60_000));
  }

  return minutes;
}

/** The instant that lands `minutes` of working time after `from`. */
export function addBusinessMinutes(from: Date, minutes: number): Date {
  let cursor = nextBusinessInstant(toLocal(from));
  let remaining = minutes;

  for (let guard = 0; guard < 400 && remaining > 0; guard++) {
    const dayEnd = endOfBusinessDay(cursor);
    const available = (dayEnd.getTime() - cursor.getTime()) / 60_000;

    if (remaining <= available) {
      return fromLocal(new Date(cursor.getTime() + remaining * 60_000));
    }

    remaining -= available;
    cursor = nextBusinessInstant(new Date(dayEnd.getTime() + 60_000));
  }

  return fromLocal(cursor);
}
