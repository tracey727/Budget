/**
 * Mapping a customer's column headers onto canonical fields.
 *
 * The suggestion is only ever a starting point shown in a dropdown — nothing is
 * imported on the strength of a guessed header. A wrong suggestion costs one
 * click; a silent wrong mapping would corrupt every finding built on it.
 */

import { sourceDefinition, type CanonicalField } from "./sources";
import type { MappingConfig, DateConvention } from "./validate";

function normaliseHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s\-.]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function scoreHeader(field: CanonicalField, header: string): number {
  const normalised = normaliseHeader(header);
  if (normalised === "") return 0;
  if (normalised === field.key) return 100;
  if (field.aliases.some((alias) => normaliseHeader(alias) === normalised)) return 90;

  const label = normaliseHeader(field.label);
  if (normalised === label) return 85;
  if (normalised.includes(field.key) || field.key.includes(normalised)) return 60;
  if (field.aliases.some((alias) => normalised.includes(normaliseHeader(alias)))) return 50;
  return 0;
}

/**
 * Best-guess mapping for a set of headers.
 *
 * A header is used at most once, and the strongest match wins it, so two
 * similar columns cannot both claim the same canonical field.
 */
export function suggestMapping(sourceType: string, headers: string[]): Record<string, string | null> {
  const definition = sourceDefinition(sourceType);
  const mapping: Record<string, string | null> = {};
  if (!definition) return mapping;

  const taken = new Set<string>();
  const candidates: { field: string; header: string; score: number }[] = [];

  for (const field of definition.fields) {
    for (const header of headers) {
      const score = scoreHeader(field, header);
      if (score > 0) candidates.push({ field: field.key, header, score });
    }
    mapping[field.key] = null;
  }

  candidates.sort((a, b) => b.score - a.score || a.field.localeCompare(b.field));

  for (const candidate of candidates) {
    if (mapping[candidate.field] !== null) continue;
    if (taken.has(candidate.header)) continue;
    mapping[candidate.field] = candidate.header;
    taken.add(candidate.header);
  }

  return mapping;
}

/** Canonical fields that are required but still unmapped. */
export function missingRequired(sourceType: string, fields: Record<string, string | null>): string[] {
  const definition = sourceDefinition(sourceType);
  if (!definition) return [];
  return definition.fields
    .filter((field) => field.required && !fields[field.key])
    .map((field) => field.label);
}

export function isDateConvention(value: string): value is DateConvention {
  return value === "iso" || value === "au_dmy";
}

/** Reads a stored mapping back into a usable config, filling any gaps. */
export function toMappingConfig(
  stored: unknown,
  timeZone: string,
): MappingConfig {
  const raw = (stored ?? {}) as Partial<MappingConfig>;
  const fields: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(raw.fields ?? {})) {
    fields[key] = typeof value === "string" && value !== "" ? value : null;
  }
  return {
    fields,
    dateConvention: isDateConvention(String(raw.dateConvention)) ? raw.dateConvention! : "iso",
    timeZone: raw.timeZone && typeof raw.timeZone === "string" ? raw.timeZone : timeZone,
  };
}
