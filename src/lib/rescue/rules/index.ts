/**
 * The V1 allied-health rule pack.
 *
 * Rules are code, versioned in source, and every finding stores the version and
 * logic hash it was produced by. That is what keeps the governance promise: a
 * later change to a rule cannot retrospectively rewrite what an earlier version
 * said, because the earlier finding carries its own provenance.
 */

import type { RuleContext, RuleDefinition, RuleOutput } from "../types";
import {
  attendanceReview,
  cancelledSlotNotRefilled,
  completedServiceNotInvoiced,
  waitlistOpportunityMissed,
} from "./appointments";
import { duplicateInvoiceCandidate, overdueInvoiceNoFollowUp, unmatchedPayment } from "./invoicing";
import { inconsistentStatusChain, overdueRevenueTask, referralNotProgressed } from "./workflow";

export const RULES: RuleDefinition[] = [
  cancelledSlotNotRefilled,
  attendanceReview,
  completedServiceNotInvoiced,
  overdueInvoiceNoFollowUp,
  unmatchedPayment,
  referralNotProgressed,
  waitlistOpportunityMissed,
  overdueRevenueTask,
  duplicateInvoiceCandidate,
  inconsistentStatusChain,
];

export const RULES_BY_ID: Record<string, RuleDefinition> = Object.fromEntries(
  RULES.map((rule) => [rule.id, rule]),
);

export function ruleById(id: string): RuleDefinition | null {
  return RULES_BY_ID[id] ?? null;
}

/** Runs one rule and tags every output with its provenance. */
export type TaggedOutput = RuleOutput & {
  ruleId: string;
  ruleVersion: number;
  ruleLogicHash: string;
};

export function runRule(rule: RuleDefinition, ctx: RuleContext): TaggedOutput[] {
  return rule.run(ctx).map((output) => ({
    ...output,
    ruleId: rule.id,
    ruleVersion: rule.version,
    ruleLogicHash: rule.logicHash,
  }));
}

/**
 * Runs the pack.
 *
 * A rule that throws is isolated: the run records the failure and the other
 * nine still produce findings, because a broken rule must never take the
 * whole detection pass — or the imported data — down with it.
 */
export function runRules(
  ctx: RuleContext,
  ruleIds?: string[],
): { outputs: TaggedOutput[]; failures: { ruleId: string; message: string }[] } {
  const selected = ruleIds && ruleIds.length > 0 ? RULES.filter((r) => ruleIds.includes(r.id)) : RULES;
  const outputs: TaggedOutput[] = [];
  const failures: { ruleId: string; message: string }[] = [];

  for (const rule of selected) {
    try {
      outputs.push(...runRule(rule, ctx));
    } catch (error) {
      failures.push({
        ruleId: rule.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { outputs, failures };
}
