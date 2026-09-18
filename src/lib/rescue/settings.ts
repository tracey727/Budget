/**
 * Tenant rule settings.
 *
 * Separated from tenant.ts so the merge can be tested without pulling in the
 * request-scoped Next.js machinery. Unknown or nonsensical stored values fall
 * back to the documented default rather than reaching a rule.
 */

import { DEFAULT_RULE_SETTINGS, type RuleSettings } from "./types";

export function mergeSettings(stored: unknown): RuleSettings {
  const raw = (stored ?? {}) as Partial<RuleSettings>;
  const numeric = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;

  return {
    refillLeadHours: numeric(raw.refillLeadHours, DEFAULT_RULE_SETTINGS.refillLeadHours),
    lateCancellationHours: numeric(raw.lateCancellationHours, DEFAULT_RULE_SETTINGS.lateCancellationHours),
    invoiceGraceDays: numeric(raw.invoiceGraceDays, DEFAULT_RULE_SETTINGS.invoiceGraceDays),
    followUpLookbackDays: numeric(raw.followUpLookbackDays, DEFAULT_RULE_SETTINGS.followUpLookbackDays),
    referralProgressDays: numeric(raw.referralProgressDays, DEFAULT_RULE_SETTINGS.referralProgressDays),
    revenueTaskTypes:
      Array.isArray(raw.revenueTaskTypes) && raw.revenueTaskTypes.length > 0
        ? raw.revenueTaskTypes.filter((type): type is string => typeof type === "string")
        : DEFAULT_RULE_SETTINGS.revenueTaskTypes,
    duplicateInvoiceWindowDays: numeric(
      raw.duplicateInvoiceWindowDays,
      DEFAULT_RULE_SETTINGS.duplicateInvoiceWindowDays,
    ),
  };
}
