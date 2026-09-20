/**
 * Deterministic row validation.
 *
 * The rule that shapes this whole file: nothing is silently coerced. A value is
 * either understood exactly, rejected with a reason the person can act on, or
 * put on HOLD because it is genuinely ambiguous. A date that could be 3 April
 * or 4 March is not quietly picked — it is held until someone says which
 * convention the file uses.
 */

import { toCents } from "@/lib/money";
import { sourceDefinition, type CanonicalField } from "./sources";
import { zonedPartsToUtc } from "./time";
import type { ValidationStatus } from "./types";

export type DateConvention = "iso" | "au_dmy";

export type MappingConfig = {
  /** Canonical field key → the header in the customer's file, or null. */
  fields: Record<string, string | null>;
  /** How to read D/M/Y-style dates in this file. */
  dateConvention: DateConvention;
  /** Tenant timezone, applied to timestamps that carry no offset. */
  timeZone: string;
};

export type FieldIssue = {
  field: string;
  header: string | null;
  value: string;
  message: string;
  severity: "invalid" | "hold";
};

export type NormalisedRow = {
  status: ValidationStatus;
  /** Canonical key → normalised value. Money is cents; timestamps are ISO. */
  values: Record<string, string | number | null>;
  issues: FieldIssue[];
};

type ParseResult =
  | { ok: true; value: string | number | null }
  | { ok: false; severity: "invalid" | "hold"; message: string };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASH_DATE = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/;
const ISO_INSTANT = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?$/;
const MONEY = /^-?\d+(\.\d{1,2})?$/;
const EXCEL_ERROR = /^#(REF|N\/A|VALUE|DIV\/0|NAME|NULL|NUM|SPILL|CALC|GETTING_DATA)[!?]?$/i;

/**
 * Problems a spreadsheet brings with it that a CSV never does.
 *
 * Both are HOLD rather than INVALID: the cell is not malformed, it is a
 * question the workbook itself never answered, and only someone looking at the
 * original file can say what the value should have been.
 */
function spreadsheetIssue(value: string): ParseResult | null {
  if (value.startsWith("=")) {
    return {
      ok: false,
      severity: "hold",
      message: `"${value}" is a spreadsheet formula whose result was never saved in the file. Open it in Excel, let it recalculate, and save again — or export as CSV.`,
    };
  }

  if (EXCEL_ERROR.test(value)) {
    return {
      ok: false,
      severity: "hold",
      message: `This cell shows the Excel error ${value}. Fix it in the workbook and upload again.`,
    };
  }

  return null;
}

function realDate(year: number, month: number, day: number): boolean {
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/** YYYY-MM-DD, or a reason it could not be read. */
export function parseDateValue(raw: string, convention: DateConvention): ParseResult {
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };

  const spreadsheet = spreadsheetIssue(value);
  if (spreadsheet) return spreadsheet;

  const iso = ISO_DATE.exec(value);
  if (iso) {
    const [, y, m, d] = iso;
    if (!realDate(Number(y), Number(m), Number(d))) {
      return { ok: false, severity: "invalid", message: `"${value}" is not a real date.` };
    }
    return { ok: true, value: `${y}-${m}-${d}` };
  }

  const slash = SLASH_DATE.exec(value);
  if (!slash) {
    return {
      ok: false,
      severity: "invalid",
      message: `"${value}" is not a date this import understands. Use YYYY-MM-DD or DD/MM/YYYY.`,
    };
  }

  const first = Number(slash[1]);
  const second = Number(slash[2]);
  let year = Number(slash[3]);
  if (slash[3].length === 2) year += year >= 70 ? 1900 : 2000;

  // Unambiguous either way: only one reading can be a month.
  const dayFirst = convention === "au_dmy" || first > 12;

  if (convention !== "au_dmy" && first <= 12 && second <= 12 && first !== second) {
    return {
      ok: false,
      severity: "hold",
      message:
        `"${value}" could be DD/MM/YYYY or MM/DD/YYYY. ` +
        "Set the date convention to Australian DD/MM/YYYY in the mapping step, or supply ISO dates.",
    };
  }

  const day = dayFirst ? first : second;
  const month = dayFirst ? second : first;

  if (month < 1 || month > 12 || !realDate(year, month, day)) {
    return { ok: false, severity: "invalid", message: `"${value}" is not a real date.` };
  }

  return { ok: true, value: `${year}-${pad(month)}-${pad(day)}` };
}

/** An ISO-8601 UTC instant, or a reason it could not be read. */
export function parseInstantValue(
  raw: string,
  convention: DateConvention,
  timeZone: string,
): ParseResult {
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };

  const spreadsheet = spreadsheetIssue(value);
  if (spreadsheet) return spreadsheet;

  const match = ISO_INSTANT.exec(value);
  if (match) {
    const [, y, m, d, hh, mm, ss, zone] = match;
    if (!realDate(Number(y), Number(m), Number(d))) {
      return { ok: false, severity: "invalid", message: `"${value}" is not a real date and time.` };
    }
    if (Number(hh) > 23 || Number(mm) > 59) {
      return { ok: false, severity: "invalid", message: `"${value}" is not a real time of day.` };
    }

    if (zone) {
      const normalised = zone === "Z" ? "Z" : zone.includes(":") ? zone : `${zone.slice(0, 3)}:${zone.slice(3)}`;
      const parsed = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss ?? "00"}${normalised}`);
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, severity: "invalid", message: `"${value}" is not a valid timestamp.` };
      }
      return { ok: true, value: parsed.toISOString() };
    }

    // No offset supplied: read it in the tenant's declared timezone.
    const instant = zonedPartsToUtc(
      {
        year: Number(y),
        month: Number(m),
        day: Number(d),
        hour: Number(hh),
        minute: Number(mm),
        second: Number(ss ?? "0"),
      },
      timeZone,
    );
    return { ok: true, value: instant.toISOString() };
  }

  // A plain date where a timestamp is expected: midnight, tenant time.
  const dateOnly = parseDateValue(value, convention);
  if (!dateOnly.ok) return dateOnly;
  if (dateOnly.value === null) return { ok: true, value: null };

  const [y, m, d] = String(dateOnly.value).split("-").map(Number);
  const instant = zonedPartsToUtc({ year: y, month: m, day: d, hour: 0, minute: 0, second: 0 }, timeZone);
  return { ok: true, value: instant.toISOString() };
}

/** Integer cents, or a reason the amount could not be read. */
export function parseMoneyValue(raw: string): ParseResult {
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };

  const spreadsheet = spreadsheetIssue(value);
  if (spreadsheet) return spreadsheet;

  let cleaned = value.replace(/[$\s,]/g, "");
  // Accounting style: (123.45) means negative.
  const bracketed = /^\((.+)\)$/.exec(cleaned);
  if (bracketed) cleaned = `-${bracketed[1]}`;

  if (!MONEY.test(cleaned)) {
    return {
      ok: false,
      severity: "invalid",
      message: `"${value}" is not an amount. Use a plain number such as 252.99.`,
    };
  }

  return { ok: true, value: toCents(cleaned) };
}

function parseField(field: CanonicalField, raw: string, config: MappingConfig): ParseResult {
  switch (field.type) {
    case "date":
      return parseDateValue(raw, config.dateConvention);
    case "datetime":
      return parseInstantValue(raw, config.dateConvention, config.timeZone);
    case "money":
      return parseMoneyValue(raw);
    case "ref":
    case "text":
    default: {
      const trimmed = raw.trim();
      if (trimmed === "") return { ok: true, value: null };
      const spreadsheet = spreadsheetIssue(trimmed);
      if (spreadsheet) return spreadsheet;
      return { ok: true, value: trimmed };
    }
  }
}

/**
 * Cross-field checks that no single column can catch.
 *
 * These produce HOLD rather than INVALID: the values are each readable, it is
 * the combination that does not make sense, and only a human looking at the
 * source system can say which side is wrong.
 */
function contradictions(
  sourceType: string,
  values: Record<string, string | number | null>,
): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const held = (field: string, message: string) =>
    issues.push({ field, header: null, value: String(values[field] ?? ""), message, severity: "hold" });

  if (sourceType === "appointments") {
    const start = values.scheduled_start as string | null;
    const end = values.scheduled_end as string | null;
    if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
      held("scheduled_end", "The appointment ends before it starts.");
    }
    const cancelled = values.cancellation_at as string | null;
    if (start && cancelled && new Date(cancelled).getTime() > new Date(start).getTime()) {
      held(
        "cancellation_at",
        "The cancellation is recorded after the appointment was due to start, which cannot be read reliably.",
      );
    }
  }

  if (sourceType === "invoices") {
    const issue = values.issue_date as string | null;
    const due = values.due_date as string | null;
    if (issue && due && due < issue) {
      held("due_date", "The invoice is due before it was issued.");
    }
    const total = values.total as number | null;
    const balance = values.balance as number | null;
    if (typeof total === "number" && typeof balance === "number" && Math.abs(balance) > Math.abs(total)) {
      held("balance", "The balance outstanding is larger than the invoice total.");
    }
  }

  if (sourceType === "referrals") {
    const received = values.received_at as string | null;
    const progressed = values.progressed_at as string | null;
    if (received && progressed && new Date(progressed).getTime() < new Date(received).getTime()) {
      held("progressed_at", "The referral was progressed before it was received.");
    }
  }

  return issues;
}

/** Validates one raw row against the canonical source definition. */
export function normaliseRow(
  sourceType: string,
  config: MappingConfig,
  raw: Record<string, string>,
): NormalisedRow {
  const definition = sourceDefinition(sourceType);
  if (!definition) {
    return {
      status: "invalid",
      values: {},
      issues: [
        { field: "source", header: null, value: sourceType, message: "Unknown source type.", severity: "invalid" },
      ],
    };
  }

  const values: Record<string, string | number | null> = {};
  const issues: FieldIssue[] = [];

  for (const field of definition.fields) {
    const header = config.fields[field.key] ?? null;
    const rawValue = header ? (raw[header] ?? "") : "";

    if (!header) {
      values[field.key] = null;
      if (field.required) {
        issues.push({
          field: field.key,
          header: null,
          value: "",
          message: `${field.label} is required but no column was mapped to it.`,
          severity: "invalid",
        });
      }
      continue;
    }

    const parsed = parseField(field, rawValue, config);
    if (!parsed.ok) {
      values[field.key] = null;
      issues.push({
        field: field.key,
        header,
        value: rawValue,
        message: parsed.message,
        severity: parsed.severity,
      });
      continue;
    }

    if (parsed.value === null && field.required) {
      issues.push({
        field: field.key,
        header,
        value: rawValue,
        message: `${field.label} is required and this row leaves it empty.`,
        severity: "invalid",
      });
    }

    values[field.key] = parsed.value;
  }

  issues.push(...contradictions(sourceType, values));

  const status: ValidationStatus = issues.some((i) => i.severity === "invalid")
    ? "invalid"
    : issues.length > 0
      ? "hold"
      : "valid";

  return { status, values, issues };
}
