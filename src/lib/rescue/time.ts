/**
 * Timezone handling for imported timestamps.
 *
 * Practice-management exports are inconsistent: some carry a full offset
 * (`2026-09-01T09:00:00+10:00`), many give bare wall-clock time
 * (`2026-09-01 09:00`). A bare time is meaningless without a zone, so it is
 * resolved against the tenant's declared timezone — a stated rule rather than
 * a guess — and everything is stored as a UTC instant from then on.
 */

/** Minutes that `timeZone` is ahead of UTC at the given instant. */
function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // `hour` comes back as 24 at midnight under hour12:false in some runtimes.
  const hour = get("hour") % 24;
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return (asIfUtc - instant.getTime()) / 60_000;
}

/**
 * Converts local wall-clock parts in `timeZone` to a UTC instant.
 *
 * The offset depends on the instant we are trying to find, so this takes the
 * offset at a first guess and then re-checks it — which is what makes the two
 * hours around a daylight-saving change come out right.
 */
export function zonedPartsToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string,
): Date {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const firstOffset = offsetMinutesAt(new Date(guess), timeZone);
  const candidate = new Date(guess - firstOffset * 60_000);
  const secondOffset = offsetMinutesAt(candidate, timeZone);
  if (secondOffset === firstOffset) return candidate;
  return new Date(guess - secondOffset * 60_000);
}

/** Renders an instant as a date and time in the tenant's timezone. */
export function formatInstant(iso: string | Date, timeZone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return typeof iso === "string" ? iso : "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Renders just the date part of an instant in the tenant's timezone. */
export function formatInstantDate(iso: string | Date, timeZone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return typeof iso === "string" ? iso : "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function hoursBetween(a: string | Date, b: string | Date): number {
  const start = typeof a === "string" ? new Date(a) : a;
  const end = typeof b === "string" ? new Date(b) : b;
  return (end.getTime() - start.getTime()) / HOUR_MS;
}

export function daysBetween(a: string | Date, b: string | Date): number {
  return hoursBetween(a, b) / 24;
}

export function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

/** Whole days between two YYYY-MM-DD dates, ignoring time entirely. */
export function dateDaysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}
