/**
 * All monetary values move through the app as strings in the database
 * (Postgres `numeric`) and as integer cents in arithmetic, so we never do
 * float maths on money.
 */

export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: number): string {
  return AUD.format(cents / 100);
}

/** Compact form for dashboard tiles: $1.2k, $45.6k, $1.2m. */
export function formatMoneyCompact(cents: number): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return AUD.format(dollars);
}

/**
 * Australian GST is 10%, and a GST-inclusive price contains 1/11th GST.
 * Returns the GST component of a tax-inclusive amount, in cents.
 */
export function gstFromInclusive(inclusiveCents: number): number {
  return Math.round(inclusiveCents / 11);
}

export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return toCents(cleaned);
}
