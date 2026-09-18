/**
 * CSV writing for exports.
 *
 * Kept apart from the route so the escaping can be tested directly. The
 * formula guard is the part that matters: an exported cell must never execute
 * when someone opens the file in Excel.
 */

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}

/** A byte-order mark keeps Excel from mangling non-ASCII characters. */
export function csvBody(headers: string[], rows: unknown[][]): string {
  return `﻿${toCsv(headers, rows)}`;
}
