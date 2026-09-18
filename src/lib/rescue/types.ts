/**
 * Canonical Revenue Rescue types.
 *
 * Everything the detection engine sees is shaped here, deliberately away from
 * the database and the UI: a rule takes a plain snapshot of a tenant's
 * operational records and returns findings. That separation is what lets the
 * ten V1 rules be covered by golden fixtures with no database in the loop.
 *
 * Money never moves through these types as a float. Amounts are integer cents,
 * and `null` means "the source did not tell us" — which is not the same as
 * zero and must never be presented as though it were.
 */

export type SourceType =
  | "appointments"
  | "invoices"
  | "payments"
  | "referrals"
  | "waitlist"
  | "tasks";

export type ValidationStatus = "valid" | "invalid" | "hold";

export type FindingStatus =
  | "new"
  | "reviewing"
  | "actioned"
  | "resolved"
  | "hold"
  | "dismissed";

export type Confidence = "high" | "medium" | "low" | "hold";

export type PriorityBand = "red" | "amber" | "green" | "hold";

export type Role = "owner" | "admin" | "manager" | "reviewer" | "auditor";

/**
 * What an estimated value actually represents.
 *
 * This exists to stop the dashboard adding unlike things together. An unmatched
 * payment is money sitting in the bank, not money lost; a waitlist slot is a
 * possibility, not a receivable. Keeping the basis on every finding is the only
 * honest way to total them.
 */
export type ValueBasis =
  | "at_risk" // service value that may not be earned
  | "outstanding" // money owed and already invoiced
  | "unmatched" // money received but not allocated
  | "potential" // opportunity value, never counted as a receivable
  | "duplicate" // possible over-billing, needs human review
  | "none";

export type EvidenceRef = {
  entityType: "appointment" | "invoice" | "payment" | "referral" | "waitlist" | "task";
  entityId: string | null;
  label: string;
  detail: Record<string, string | number | null>;
};

/* -------------------------------------------------------------------------- */
/*                          Canonical operational records                      */
/* -------------------------------------------------------------------------- */

export type Appointment = {
  id: string;
  externalRef: string;
  clientRef: string | null;
  workerRef: string | null;
  /** ISO-8601 instant. */
  scheduledStart: string;
  scheduledEnd: string | null;
  status: string;
  serviceValueCents: number | null;
  cancellationAt: string | null;
};

export type Invoice = {
  id: string;
  externalRef: string;
  clientRef: string | null;
  /** YYYY-MM-DD. */
  issueDate: string;
  dueDate: string | null;
  totalCents: number;
  balanceCents: number;
  status: string;
};

export type Payment = {
  id: string;
  externalRef: string | null;
  paymentDate: string;
  amountCents: number;
  /** The invoice reference as supplied by the source, before matching. */
  invoiceRef: string | null;
  matchStatus: "matched" | "unmatched" | "hold";
};

export type Referral = {
  id: string;
  externalRef: string | null;
  receivedAt: string;
  status: string;
  progressedAt: string | null;
};

export type WaitlistEntry = {
  id: string;
  externalRef: string | null;
  clientRef: string | null;
  status: string;
  availability: string | null;
  /** When the person joined the waitlist, if the export carries it. */
  createdAt: string | null;
};

export type OperationalTask = {
  id: string;
  externalRef: string | null;
  taskType: string;
  dueAt: string | null;
  status: string;
  relatedValueCents: number | null;
  /** The invoice/appointment/referral this task is chasing, when supplied. */
  relatedRef: string | null;
};

/** One tenant's committed operational data, as the rules see it. */
export type TenantDataset = {
  appointments: Appointment[];
  invoices: Invoice[];
  payments: Payment[];
  referrals: Referral[];
  waitlist: WaitlistEntry[];
  tasks: OperationalTask[];
};

export function emptyDataset(): TenantDataset {
  return {
    appointments: [],
    invoices: [],
    payments: [],
    referrals: [],
    waitlist: [],
    tasks: [],
  };
}

/* -------------------------------------------------------------------------- */
/*                                Rule contracts                               */
/* -------------------------------------------------------------------------- */

/**
 * Tenant-tunable thresholds.
 *
 * Every one of these is a business policy, not a fact about the data, so it
 * lives in tenant settings and is quoted back in the finding explanation. A
 * customer who disagrees with a threshold should be able to see which number
 * produced the finding.
 */
export type RuleSettings = {
  /** A cancelled slot starting within this many hours is treated as at risk. */
  refillLeadHours: number;
  /** A cancellation this close to the start counts as a late cancellation. */
  lateCancellationHours: number;
  /** Days allowed between a completed service and its invoice. */
  invoiceGraceDays: number;
  /** How far back a follow-up on an overdue invoice still counts. */
  followUpLookbackDays: number;
  /** Days a referral may sit before it is considered not progressed. */
  referralProgressDays: number;
  /** Task types treated as revenue or continuity relevant. */
  revenueTaskTypes: string[];
  /** Invoices this many days apart may be duplicates of each other. */
  duplicateInvoiceWindowDays: number;
};

export const DEFAULT_RULE_SETTINGS: RuleSettings = {
  refillLeadHours: 48,
  lateCancellationHours: 24,
  invoiceGraceDays: 7,
  followUpLookbackDays: 14,
  referralProgressDays: 14,
  revenueTaskTypes: [
    "invoice_followup",
    "payment_followup",
    "claim_followup",
    "referral_followup",
    "rebooking",
  ],
  duplicateInvoiceWindowDays: 3,
};

export type RuleContext = {
  /** The instant the run is evaluated against — passed in, never `Date.now()`. */
  now: Date;
  /** The tenant's timezone, which decides what "today" and "overdue" mean. */
  timeZone: string;
  settings: RuleSettings;
  data: TenantDataset;
};

/**
 * What a rule emits. Note there is no priority band here: banding is applied
 * centrally in `priority.ts` so that one change of policy moves every rule.
 */
export type RuleOutput = {
  /** Stable within a tenant, so a re-run updates rather than duplicates. */
  findingKey: string;
  title: string;
  /** Plain language, no jargon, safe to show a practice manager. */
  explanation: string;
  /** How the number was arrived at, or why there is no number. */
  calculation: string;
  confidence: Confidence;
  estimatedValueCents: number | null;
  valueBasis: ValueBasis;
  /** Required whenever confidence is "hold". */
  holdReason?: string;
  /** The moment the underlying problem started, used for ageing. */
  occurredAt: string;
  evidence: EvidenceRef[];
};

export type RuleDefinition = {
  id: string;
  name: string;
  domain: string;
  version: number;
  /**
   * Bumped by hand whenever the logic changes, alongside `version`.
   *
   * Findings store the hash they were produced by, so a later rule change can
   * never make a historical finding look as though it came from logic that did
   * not exist when it was raised.
   */
  logicHash: string;
  description: string;
  enabledByDefault: boolean;
  run(ctx: RuleContext): RuleOutput[];
};

/* -------------------------------------------------------------------------- */
/*                        Narrowing values read back from the database         */
/* -------------------------------------------------------------------------- */

/**
 * Postgres gives these back as plain text. Rather than casting at every call
 * site, they are narrowed once here and fall back to the safest option: an
 * unrecognised band is treated as HOLD, and an unrecognised basis claims
 * nothing.
 */
export function asBand(value: string): PriorityBand {
  return value === "red" || value === "amber" || value === "green" ? value : "hold";
}

export function asValueBasis(value: string): ValueBasis {
  const known: ValueBasis[] = ["at_risk", "outstanding", "unmatched", "potential", "duplicate", "none"];
  return known.includes(value as ValueBasis) ? (value as ValueBasis) : "none";
}

export function asConfidence(value: string): Confidence {
  return value === "high" || value === "medium" || value === "low" ? value : "hold";
}

/** A `numeric` column as integer cents, or null when the column is null. */
export function centsOf(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
