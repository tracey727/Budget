/**
 * The Gen Money commercial model.
 *
 * Prices are in AUD and are the single source of truth for the marketing
 * pricing table, the Stripe product bootstrap script, and entitlement checks.
 * Amounts are stored in cents to avoid float drift.
 */

export type PlanKey = "starter" | "personal" | "professional";
export type BillingInterval = "month" | "year";

export type PlanPrice = {
  /** Stable identifier used in checkout URLs and the Stripe lookup_key. */
  lookupKey: string;
  label: string;
  amountCents: number;
  interval: BillingInterval;
  /** Founding prices are promotional: first period only, then standard rate. */
  founding?: boolean;
  note?: string;
};

export type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  purpose: string;
  monthly: PlanPrice | null;
  annual: PlanPrice | null;
  founding?: PlanPrice;
  features: string[];
  limits: PlanLimits;
  highlight?: boolean;
};

export type PlanLimits = {
  /** Concurrent, non-archived trips. */
  trips: number;
  accounts: number;
  /** Rolling 12-month transaction ceiling. */
  transactions: number;
  budgets: number;
  goals: number;
  csvImport: boolean;
  reports: boolean;
  /** GST / deduction tooling for sole traders. */
  businessTools: boolean;
  dataExport: boolean;
  prioritySupport: boolean;
};

export const PLANS: Record<PlanKey, Plan> = {
  starter: {
    key: "starter",
    name: "Starter",
    tagline: "Start free. No credit card required.",
    purpose: "Get people into the app",
    monthly: { lookupKey: "starter_monthly", label: "FREE", amountCents: 0, interval: "month" },
    annual: { lookupKey: "starter_annual", label: "FREE", amountCents: 0, interval: "year" },
    features: [
      "1 trip budget at a time",
      "Up to 2 accounts",
      "500 transactions a year",
      "5 monthly budgets",
      "1 savings goal",
      "Travel categories ready to go — fuel, parks, permits",
    ],
    limits: {
      trips: 1,
      accounts: 2,
      transactions: 500,
      budgets: 5,
      goals: 1,
      csvImport: false,
      reports: false,
      businessTools: false,
      dataExport: false,
      prioritySupport: false,
    },
  },
  personal: {
    key: "personal",
    name: "Personal Premium",
    tagline: "Every trip, every dollar, all in one place.",
    purpose: "Main consumer product",
    highlight: true,
    monthly: {
      lookupKey: "personal_monthly",
      label: "$9.99",
      amountCents: 999,
      interval: "month",
    },
    annual: {
      lookupKey: "personal_annual",
      label: "$99",
      amountCents: 9900,
      interval: "year",
      note: "Save $20.88 a year",
    },
    founding: {
      lookupKey: "personal_founding_annual",
      label: "$69 first year",
      amountCents: 6900,
      interval: "year",
      founding: true,
      note: "Launch promotion — first year only, then $99/year",
    },
    features: [
      "Unlimited trips, each with its own budget",
      "Daily spend remaining while you travel",
      "Unlimited accounts and transactions",
      "Unlimited budgets and goals",
      "CSV bank statement import with duplicate detection",
      "Full reports: cash flow, category trends, net worth",
      "Rego, insurance and roadside cover tracked by due date",
      "Export to CSV any time",
    ],
    limits: {
      trips: Number.POSITIVE_INFINITY,
      accounts: Number.POSITIVE_INFINITY,
      transactions: Number.POSITIVE_INFINITY,
      budgets: Number.POSITIVE_INFINITY,
      goals: Number.POSITIVE_INFINITY,
      csvImport: true,
      reports: true,
      businessTools: false,
      dataExport: true,
      prioritySupport: false,
    },
  },
  professional: {
    key: "professional",
    name: "Professional",
    tagline: "Built for sole traders working as they travel.",
    purpose: "Sole traders/professionals",
    monthly: {
      lookupKey: "professional_monthly",
      label: "$19.99",
      amountCents: 1999,
      interval: "month",
    },
    annual: {
      lookupKey: "professional_annual",
      label: "$199",
      amountCents: 19900,
      interval: "year",
      note: "Save $40.88 a year",
    },
    founding: {
      lookupKey: "professional_founding_annual",
      label: "$139 first year",
      amountCents: 13900,
      interval: "year",
      founding: true,
      note: "Launch promotion — first year only, then $199/year",
    },
    features: [
      "Everything in Personal Premium",
      "Separate business and personal ledgers while you travel",
      "GST tracking and BAS-ready quarterly summaries",
      "Deductible expense tagging",
      "Australian financial year reporting (1 Jul – 30 Jun)",
      "Accountant-ready export pack",
      "Priority support",
    ],
    limits: {
      trips: Number.POSITIVE_INFINITY,
      accounts: Number.POSITIVE_INFINITY,
      transactions: Number.POSITIVE_INFINITY,
      budgets: Number.POSITIVE_INFINITY,
      goals: Number.POSITIVE_INFINITY,
      csvImport: true,
      reports: true,
      businessTools: true,
      dataExport: true,
      prioritySupport: true,
    },
  },
};

export const PLAN_ORDER: PlanKey[] = ["starter", "personal", "professional"];

/** Every purchasable price, in the order the Stripe bootstrap creates them. */
export function purchasablePrices(): Array<PlanPrice & { planKey: PlanKey }> {
  const out: Array<PlanPrice & { planKey: PlanKey }> = [];
  for (const key of PLAN_ORDER) {
    const plan = PLANS[key];
    if (key === "starter") continue;
    if (plan.monthly) out.push({ ...plan.monthly, planKey: key });
    if (plan.annual) out.push({ ...plan.annual, planKey: key });
    if (plan.founding) out.push({ ...plan.founding, planKey: key });
  }
  return out;
}

export function planFromLookupKey(lookupKey: string): PlanKey {
  if (lookupKey.startsWith("professional")) return "professional";
  if (lookupKey.startsWith("personal")) return "personal";
  return "starter";
}

/** Statuses that entitle a user to their paid plan. */
const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

export function effectivePlan(
  plan: string | null | undefined,
  status: string | null | undefined,
): PlanKey {
  if (!plan || plan === "starter") return "starter";
  if (!status || !ENTITLED_STATUSES.has(status)) return "starter";
  return plan === "professional" ? "professional" : "personal";
}

export function limitsFor(plan: PlanKey): PlanLimits {
  return PLANS[plan].limits;
}

export function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
