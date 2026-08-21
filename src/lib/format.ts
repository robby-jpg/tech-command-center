import { COMPANY_TIME_ZONE } from "@/domain";

/**
 * Date and number formatting.
 *
 * Every formatter pins the time zone to the company's. Without it the server
 * (UTC in most hosts) and the browser (Denver, for the people using this)
 * produce different strings for the same instant and React reports a hydration
 * mismatch — a real bug this application would otherwise hit on every page.
 */

const TZ = COMPANY_TIME_ZONE;

const dateShort = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: TZ,
});

const dateMedium = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: TZ,
});

const dateLong = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: TZ,
});

const timeShort = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TZ,
});

const dateTimeMedium = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TZ,
});

const monthYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: TZ,
});

const weekday = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: TZ,
});

export const formatDateShort = (d: string | Date) => dateShort.format(toDate(d));
export const formatDate = (d: string | Date) => dateMedium.format(toDate(d));
export const formatDateLong = (d: string | Date) => dateLong.format(toDate(d));
export const formatTime = (d: string | Date) => timeShort.format(toDate(d));
export const formatDateTime = (d: string | Date) => dateTimeMedium.format(toDate(d));
export const formatMonth = (d: string | Date) => monthYear.format(toDate(d));
export const formatWeekday = (d: string | Date) => weekday.format(toDate(d));

function toDate(d: string | Date): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/**
 * "18 minutes ago", "3 days ago", "in 2 hours".
 *
 * `now` is passed in rather than read from the clock so that the caller
 * controls the reference point — the anchored dataset depends on this.
 */
export function formatRelative(value: string | Date, now: string | Date): string {
  const then = toDate(value).getTime();
  const reference = toDate(now).getTime();
  const diffMs = reference - then;
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  let body: string;
  if (minutes < 1) body = "just now";
  else if (minutes < 60) body = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  else if (hours < 24) body = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  else if (days < 31) body = `${days} ${days === 1 ? "day" : "days"}`;
  else {
    const months = Math.round(days / 30.44);
    body = `${months} ${months === 1 ? "month" : "months"}`;
  }

  if (body === "just now") return body;
  return future ? `in ${body}` : `${body} ago`;
}

/** Compact age for a dense table column: "18m", "4h", "3d". */
export function formatAge(value: string | Date, now: string | Date): string {
  const abs = Math.abs(toDate(now).getTime() - toDate(value).getTime());
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;
  const hours = Math.floor(abs / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(abs / 86_400_000);
  if (days < 365) return `${days}d`;
  return `${Math.floor(days / 365)}y`;
}

/** A duration in minutes, said the way a person would say it. */
export function formatDuration(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  if (abs < 60) return `${abs} min`;
  if (abs < 60 * 24) {
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  }
  const d = Math.floor(abs / (60 * 24));
  const h = Math.round((abs % (60 * 24)) / 60);
  return h === 0 ? `${d} ${d === 1 ? "day" : "days"}` : `${d}d ${h}h`;
}

/** Hours, to one decimal only when it earns it. */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} hrs` : `${rounded.toFixed(1)} hrs`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** "+8%" / "−12%" — the minus is a real minus sign, not a hyphen. */
export function formatDelta(value: number, digits = 0): string {
  const rounded = Number(value.toFixed(digits));
  if (rounded === 0) return "no change";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(digits)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
