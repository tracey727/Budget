/**
 * Date helpers fixed to Australian conventions: DD/MM/YYYY display and a
 * financial year running 1 July – 30 June.
 *
 * Dates are stored as `YYYY-MM-DD` strings (Postgres `date`), which are
 * timezone-free by design — a transaction on 1 July is on 1 July regardless of
 * which edge location renders it.
 */

export const AU_TIMEZONE = "Australia/Sydney";

/** Today in Australian eastern time, as YYYY-MM-DD. */
export function todayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AU_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatDateAu(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** First day of the month containing `iso`. */
export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** First day of the month after the one containing `iso`. */
export function nextMonthStart(iso: string): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function addMonths(iso: string, count: number): string {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const total = year * 12 + (month - 1) + count;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(iso: string, count: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/**
 * The Australian financial year containing `iso`.
 * FY2026 runs 1 July 2025 – 30 June 2026.
 */
export function financialYear(iso: string): {
  label: string;
  start: string;
  end: string;
} {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const startYear = month >= 7 ? year : year - 1;
  return {
    label: `FY${String(startYear + 1)}`,
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
  };
}

/** Inclusive difference in days between two ISO dates. */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

const FREQUENCY_STEPS: Record<string, (iso: string) => string> = {
  weekly: (iso) => addDays(iso, 7),
  fortnightly: (iso) => addDays(iso, 14),
  monthly: (iso) => addMonths(iso, 1),
  quarterly: (iso) => addMonths(iso, 3),
  yearly: (iso) => addMonths(iso, 12),
};

export function advanceByFrequency(iso: string, frequency: string): string {
  return (FREQUENCY_STEPS[frequency] ?? FREQUENCY_STEPS.monthly)(iso);
}

export const AU_STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;
