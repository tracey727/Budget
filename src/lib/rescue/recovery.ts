/**
 * The rules that keep confirmed recovery honest.
 *
 * Pure functions, deliberately: these are the arithmetic a customer would
 * challenge — "you say you recovered $4,000, show me" — so they are covered by
 * tests rather than buried inside a form handler.
 */

import { centsToDecimalString } from "@/lib/money";

export type RecoveryCheck =
  | { ok: true }
  | { ok: false; reason: "held" | "not_positive" | "negative" | "exceeds_estimate"; message: string };

export function checkRecovery(input: {
  /** True when the finding's evidence contradicts itself. */
  held: boolean;
  /** The finding's estimated value, or null when it claims none. */
  estimatedCents: number | null;
  /** Confirmed recovery already posted against this finding, net of reversals. */
  alreadyCents: number;
  amountCents: number;
}): RecoveryCheck {
  if (input.held) {
    return {
      ok: false,
      reason: "held",
      message:
        "This finding is on HOLD because its source data contradicts itself. Correct the data and re-run detection before recording recovery against it.",
    };
  }

  if (input.amountCents === 0) {
    return { ok: false, reason: "not_positive", message: "Enter an amount like 252.99." };
  }

  if (input.amountCents < 0) {
    return {
      ok: false,
      reason: "negative",
      message: "To correct a mistake, reverse the original recovery rather than posting a negative amount.",
    };
  }

  // A finding that claims no value cannot be over-recovered against, because
  // there is no estimate to exceed. Partial and repeat entries are normal.
  if (input.estimatedCents === null) return { ok: true };

  if (input.alreadyCents + input.amountCents > input.estimatedCents) {
    const remaining = Math.max(0, input.estimatedCents - input.alreadyCents);
    return {
      ok: false,
      reason: "exceeds_estimate",
      message:
        remaining === 0
          ? "This finding is already fully recovered. Recording more would double-count it."
          : `Only ${centsToDecimalString(remaining)} of this finding's estimated value is left to recover. Record that, or reverse the earlier entry first.`,
    };
  }

  return { ok: true };
}

/** True once confirmed recovery has met the estimate. */
export function fullyRecovered(estimatedCents: number | null, recoveredCents: number): boolean {
  return estimatedCents !== null && recoveredCents >= estimatedCents;
}
