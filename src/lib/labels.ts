/**
 * Display labels shared between server actions and pages.
 *
 * These live outside the "use server" action modules because a `"use server"`
 * file may only export async functions — exporting a plain object from one is
 * a build error.
 */

export const ACCOUNT_TYPE_LABELS = {
  transaction: "Everyday transaction",
  savings: "Savings",
  credit: "Credit card",
  offset: "Offset",
  super: "Superannuation",
  investment: "Investment",
  cash: "Cash",
  loan: "Loan / mortgage",
} as const;

export const GOAL_KIND_LABELS = {
  emergency: "Emergency fund",
  home: "Home deposit",
  travel: "Travel",
  vehicle: "Vehicle",
  debt: "Pay off debt",
  other: "Other",
} as const;

export const FREQUENCY_LABELS = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
} as const;

export const ACCOUNT_TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const GOAL_KIND_OPTIONS = Object.entries(GOAL_KIND_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const FREQUENCY_OPTIONS = Object.entries(FREQUENCY_LABELS).map(
  ([value, label]) => ({ value, label }),
);
