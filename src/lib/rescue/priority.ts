/**
 * Priority scoring.
 *
 * Banding lives here rather than inside the rules so that a change of policy
 * moves every rule at once, and so the reason a finding is RED can be written
 * out in words on the finding itself. Nothing about the score is learned or
 * probabilistic: the same finding always scores the same, which is what makes
 * it arguable with a customer.
 */

import { formatMoney } from "@/lib/money";
import { DAY_MS } from "./time";
import type { Confidence, PriorityBand, ValueBasis } from "./types";

export type PriorityInput = {
  confidence: Confidence;
  estimatedValueCents: number | null;
  valueBasis: ValueBasis;
  /** When the underlying problem started. */
  occurredAt: string;
  now: Date;
};

export type PriorityResult = {
  score: number;
  band: PriorityBand;
  /** Plain-language breakdown shown on the finding detail screen. */
  rationale: string;
  ageDays: number;
};

/** Money weight, on a deliberately flat curve so one big item cannot swamp the queue. */
function valueWeight(cents: number | null): { points: number; note: string } {
  if (cents === null) return { points: 10, note: "no dollar value was supplied by the source (10)" };
  const abs = Math.abs(cents);
  if (abs >= 500_000) return { points: 60, note: `${formatMoney(abs)} at stake (60)` };
  if (abs >= 100_000) return { points: 50, note: `${formatMoney(abs)} at stake (50)` };
  if (abs >= 30_000) return { points: 40, note: `${formatMoney(abs)} at stake (40)` };
  if (abs >= 10_000) return { points: 28, note: `${formatMoney(abs)} at stake (28)` };
  if (abs > 0) return { points: 18, note: `${formatMoney(abs)} at stake (18)` };
  return { points: 8, note: "the value works out at nil (8)" };
}

function ageWeight(days: number): { points: number; note: string } {
  const whole = Math.max(0, Math.floor(days));
  if (whole >= 60) return { points: 25, note: `${whole} days old (25)` };
  if (whole >= 30) return { points: 21, note: `${whole} days old (21)` };
  if (whole >= 14) return { points: 16, note: `${whole} days old (16)` };
  if (whole >= 7) return { points: 10, note: `${whole} days old (10)` };
  return { points: 5, note: `${whole} days old (5)` };
}

function confidenceWeight(confidence: Confidence): { points: number; note: string } {
  switch (confidence) {
    case "high":
      return { points: 15, note: "the evidence is complete (15)" };
    case "medium":
      return { points: 9, note: "some supporting detail is missing (9)" };
    case "low":
      return { points: 4, note: "the evidence is thin (4)" };
    case "hold":
      return { points: 0, note: "the evidence contradicts itself (0)" };
  }
}

export const RED_THRESHOLD = 75;
export const AMBER_THRESHOLD = 45;

export function scoreFinding(input: PriorityInput): PriorityResult {
  const ageDays = Math.max(0, (input.now.getTime() - new Date(input.occurredAt).getTime()) / DAY_MS);

  // A held finding is not ranked against real findings at all. It is a data
  // problem, and pretending to score it would imply a certainty we do not have.
  if (input.confidence === "hold") {
    return {
      score: 0,
      band: "hold",
      rationale:
        "Held rather than ranked: the imported data contradicts itself or is incomplete, " +
        "so no priority can be claimed until it is corrected.",
      ageDays: Math.floor(ageDays),
    };
  }

  const value = valueWeight(input.estimatedValueCents);
  const age = ageWeight(ageDays);
  const certainty = confidenceWeight(input.confidence);
  const score = value.points + age.points + certainty.points;

  const band: PriorityBand = score >= RED_THRESHOLD ? "red" : score >= AMBER_THRESHOLD ? "amber" : "green";

  const bandWord = band === "red" ? "RED" : band === "amber" ? "AMBER" : "GREEN";
  const rationale =
    `Scored ${score} of a possible 100 — ${bandWord}. ` +
    `Value: ${value.note}. Age: ${age.note}. Confidence: ${certainty.note}. ` +
    `RED starts at ${RED_THRESHOLD}, AMBER at ${AMBER_THRESHOLD}.`;

  return { score, band, rationale, ageDays: Math.floor(ageDays) };
}

export const BAND_LABEL: Record<PriorityBand, string> = {
  red: "Red",
  amber: "Amber",
  green: "Green",
  hold: "Hold",
};

export const VALUE_BASIS_LABEL: Record<ValueBasis, string> = {
  at_risk: "Value at risk",
  outstanding: "Outstanding balance",
  unmatched: "Unmatched funds",
  potential: "Potential value",
  duplicate: "Possible over-billing",
  none: "No value claimed",
};

/**
 * Which bases may be added together into the headline "value at risk".
 *
 * Unmatched money is already in the bank, potential value has not been earned,
 * and a duplicate is a billing question rather than a loss — adding any of them
 * to money genuinely at risk would overstate the number.
 */
export const AT_RISK_BASES: ValueBasis[] = ["at_risk", "outstanding"];
