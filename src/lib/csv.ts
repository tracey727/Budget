/**
 * Minimal RFC-4180 CSV parser.
 *
 * Bank exports routinely contain quoted fields with embedded commas
 * ("WOOLWORTHS 1234, SYDNEY"), escaped quotes and mixed line endings, so a
 * `split(",")` is not adequate. This handles those cases without a dependency.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM, which Excel adds and which otherwise corrupts the
  // first header cell.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Treat \r\n as a single break.
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Flush the trailing field/row when the file has no final newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/**
 * Australian bank exports use DD/MM/YYYY. Accepts that plus ISO and a few
 * common separators, and returns YYYY-MM-DD.
 */
export function parseAuDate(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  // Already ISO.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parts = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(trimmed);
  if (!parts) return null;

  const day = Number(parts[1]);
  const month = Number(parts[2]);
  let year = Number(parts[3]);

  // Two-digit years: 70-99 => 19xx, 00-69 => 20xx.
  if (parts[3].length === 2) year += year >= 70 ? 1900 : 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Reject dates that do not exist, e.g. 31/02/2026.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parses an amount, tolerating $, thousands separators and (123.45) negatives. */
export function parseCsvAmount(value: string): number | null {
  let text = value.trim();
  if (text === "") return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  text = text.replace(/[$\s,]/g, "");
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }
  if (text.startsWith("+")) text = text.slice(1);

  if (!/^\d+(\.\d+)?$/.test(text)) return null;

  const cents = Math.round(Number.parseFloat(text) * 100);
  return negative ? -cents : cents;
}

const DATE_HEADERS = ["date", "transaction date", "processed date", "value date", "posting date"];
const DESC_HEADERS = ["description", "narrative", "details", "transaction details", "memo", "reference", "payee"];
const AMOUNT_HEADERS = ["amount", "value", "transaction amount"];
const DEBIT_HEADERS = ["debit", "debit amount", "withdrawal", "withdrawals", "money out"];
const CREDIT_HEADERS = ["credit", "credit amount", "deposit", "deposits", "money in"];

function findColumn(headers: string[], candidates: string[]): number {
  const normalised = headers.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const exact = normalised.indexOf(candidate);
    if (exact !== -1) return exact;
  }
  for (const candidate of candidates) {
    const partial = normalised.findIndex((h) => h.includes(candidate));
    if (partial !== -1) return partial;
  }
  return -1;
}

export type CsvMapping = {
  date: number;
  description: number;
  amount: number;
  debit: number;
  credit: number;
  hasHeader: boolean;
};

/**
 * Works out which column is which. Handles both single-amount exports (ANZ,
 * CommBank) and separate debit/credit columns (NAB, Westpac, Bendigo).
 */
export function detectMapping(rows: string[][]): CsvMapping | null {
  if (rows.length === 0) return null;

  const header = rows[0];
  const date = findColumn(header, DATE_HEADERS);
  const description = findColumn(header, DESC_HEADERS);
  const amount = findColumn(header, AMOUNT_HEADERS);
  const debit = findColumn(header, DEBIT_HEADERS);
  const credit = findColumn(header, CREDIT_HEADERS);

  if (date !== -1 && description !== -1 && (amount !== -1 || debit !== -1 || credit !== -1)) {
    return { date, description, amount, debit, credit, hasHeader: true };
  }

  // No recognisable header — fall back to positional detection on the first
  // row, which covers headerless CommBank exports (date, amount, description).
  const first = rows[0];
  const dateIndex = first.findIndex((cell) => parseAuDate(cell) !== null);
  if (dateIndex === -1) return null;

  const amountIndex = first.findIndex(
    (cell, i) => i !== dateIndex && parseCsvAmount(cell) !== null,
  );
  if (amountIndex === -1) return null;

  const descIndex = first.findIndex(
    (cell, i) => i !== dateIndex && i !== amountIndex && cell.trim() !== "",
  );

  return {
    date: dateIndex,
    description: descIndex === -1 ? dateIndex : descIndex,
    amount: amountIndex,
    debit: -1,
    credit: -1,
    hasHeader: false,
  };
}

export type ParsedRow = {
  occurredOn: string;
  description: string;
  amountCents: number;
};

export type ImportPreview = {
  rows: ParsedRow[];
  skipped: number;
  errors: string[];
};

export function extractRows(rows: string[][], mapping: CsvMapping): ImportPreview {
  const body = mapping.hasHeader ? rows.slice(1) : rows;
  const out: ParsedRow[] = [];
  const errors: string[] = [];
  let skipped = 0;

  body.forEach((row, index) => {
    const lineNumber = index + (mapping.hasHeader ? 2 : 1);

    const occurredOn = parseAuDate(row[mapping.date] ?? "");
    if (!occurredOn) {
      skipped += 1;
      if (errors.length < 5) errors.push(`Line ${lineNumber}: could not read the date.`);
      return;
    }

    let amountCents: number | null = null;

    if (mapping.amount !== -1) {
      amountCents = parseCsvAmount(row[mapping.amount] ?? "");
    } else {
      // Separate debit and credit columns: debits are money out.
      const debit = mapping.debit !== -1 ? parseCsvAmount(row[mapping.debit] ?? "") : null;
      const credit = mapping.credit !== -1 ? parseCsvAmount(row[mapping.credit] ?? "") : null;
      if (debit !== null && debit !== 0) amountCents = -Math.abs(debit);
      else if (credit !== null && credit !== 0) amountCents = Math.abs(credit);
    }

    if (amountCents === null || amountCents === 0) {
      skipped += 1;
      if (errors.length < 5) errors.push(`Line ${lineNumber}: could not read the amount.`);
      return;
    }

    const description = (row[mapping.description] ?? "").trim() || "Imported transaction";

    out.push({ occurredOn, description: description.slice(0, 200), amountCents });
  });

  return { rows: out, skipped, errors };
}
