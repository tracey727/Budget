/**
 * Turning an uploaded file into rows.
 *
 * The raw file is never kept. Rows are parsed at upload time, stored as
 * structured JSON against the import job, and the file itself is discarded —
 * which is both the data-minimisation position in the security baseline and
 * the reason no object storage is needed for V1.
 */

import { parseCsv } from "@/lib/csv";

/** Generous enough for a year of a busy clinic, small enough to stay safe. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 20_000;

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
  sha256: string;
};

export type ParseFailure = { error: string };

export function isParseFailure(value: ParsedFile | ParseFailure): value is ParseFailure {
  return "error" in value;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Headers are de-duplicated so two identical columns stay addressable. */
function uniqueHeaders(row: string[]): string[] {
  const seen = new Map<string, number>();
  return row.map((header, index) => {
    const base = header.trim() === "" ? `column_${index + 1}` : header.trim();
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

export async function parseUpload(file: File): Promise<ParsedFile | ParseFailure> {
  const name = file.name.toLowerCase();

  if (file.size === 0) return { error: "That file is empty." };
  if (file.size > MAX_FILE_BYTES) {
    return { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.` };
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return {
      error:
        "Excel files are not accepted yet. In Excel choose File → Save As → CSV UTF-8, then upload the CSV.",
    };
  }

  if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
    return { error: "Upload a CSV file exported from your practice system." };
  }

  const bytes = await file.arrayBuffer();
  const sha256 = await sha256Hex(bytes);
  const text = new TextDecoder("utf-8").decode(bytes);
  const table = parseCsv(text);

  if (table.length === 0) return { error: "That file has no rows in it." };
  if (table.length - 1 > MAX_ROWS) {
    return { error: `That file has ${table.length - 1} rows. The limit is ${MAX_ROWS} per import.` };
  }

  const headers = uniqueHeaders(table[0]);
  const rows = table.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });

  if (rows.length === 0) return { error: "That file has a header row but no data." };

  return { headers, rows, sha256 };
}
