/** Wording shared between screens. Kept out of server-action files. */

import type { Confidence, FindingStatus, ValidationStatus } from "./types";

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  new: "New",
  reviewing: "Being reviewed",
  actioned: "Actioned",
  resolved: "Resolved",
  hold: "On hold",
  dismissed: "Dismissed",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  hold: "Evidence conflicts",
};

export const VALIDATION_LABEL: Record<ValidationStatus, string> = {
  valid: "Ready to commit",
  invalid: "Rejected",
  hold: "On hold",
};

export const DISMISS_REASONS: { code: string; label: string }[] = [
  { code: "not_leakage", label: "Not leakage — the rule does not apply here" },
  { code: "already_handled", label: "Already handled outside this system" },
  { code: "data_error", label: "The imported data was wrong" },
  { code: "policy_decision", label: "A deliberate decision by the practice" },
  { code: "duplicate_finding", label: "Duplicate of another finding" },
  { code: "other", label: "Other (explain below)" },
];

export const DISMISS_REASON_LABEL: Record<string, string> = Object.fromEntries(
  DISMISS_REASONS.map((reason) => [reason.code, reason.label]),
);

export const ACTION_STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};
