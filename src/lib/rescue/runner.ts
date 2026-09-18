/**
 * The detection pass.
 *
 * Three promises are kept here, and they are the ones a customer will test:
 *
 *  - Re-running over unchanged data changes nothing. Findings are keyed, so a
 *    second pass updates the same row rather than producing a second copy.
 *  - A condition that has gone away resolves itself, with a reason recorded.
 *  - A rule that throws does not take the run, or the imported data, with it.
 *    Its failure is recorded and the other rules still produce their findings.
 */

import { and, eq, inArray, isNull, not } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  rrFindingEvidence,
  rrFindings,
  rrRuleRuns,
  type RrFinding,
} from "@/lib/db/schema";
import { centsToDecimalString } from "@/lib/money";
import { recordAudit } from "./audit";
import { loadDataset } from "./dataset";
import { scoreFinding } from "./priority";
import { runRules } from "./rules";
import type { TenantContext } from "./tenant";

export type RunSummary = {
  runId: string;
  created: number;
  updated: number;
  resolved: number;
  failures: { ruleId: string; message: string }[];
};

/** Statuses that a fresh detection pass is allowed to touch. */
const LIVE_STATUSES = ["new", "reviewing", "actioned", "hold"];

export async function runDetection(
  context: TenantContext,
  ruleIds?: string[],
): Promise<RunSummary> {
  const tenantId = context.tenant.id;
  const now = new Date();

  const data = await loadDataset(tenantId);
  const { outputs, failures } = runRules(
    { now, timeZone: context.tenant.timezone, settings: context.settings, data },
    ruleIds,
  );

  const runRows = await db()
    .insert(rrRuleRuns)
    .values({
      tenantId,
      status: failures.length > 0 ? "failed" : "complete",
      ruleIdsJson: ruleIds ?? null,
      failuresJson: failures,
      createdBy: context.viewer.id,
    })
    .returning({ id: rrRuleRuns.id });
  const runId = runRows[0].id;

  const existing = await db()
    .select({ id: rrFindings.id, key: rrFindings.findingKey, status: rrFindings.status })
    .from(rrFindings)
    .where(eq(rrFindings.tenantId, tenantId));
  const existingByKey = new Map(existing.map((row) => [row.key, row]));

  let created = 0;
  let updated = 0;

  for (const output of outputs) {
    const priority = scoreFinding({
      confidence: output.confidence,
      estimatedValueCents: output.estimatedValueCents,
      valueBasis: output.valueBasis,
      occurredAt: output.occurredAt,
      now,
    });

    const previous = existingByKey.get(output.findingKey);

    // A dismissed or resolved finding is left exactly as it is. Re-detecting a
    // condition someone has already judged must not silently reopen it.
    if (previous && !LIVE_STATUSES.includes(previous.status)) continue;

    const values = {
      tenantId,
      ruleId: output.ruleId,
      ruleVersion: output.ruleVersion,
      ruleLogicHash: output.ruleLogicHash,
      findingKey: output.findingKey,
      title: output.title,
      explanation: output.explanation,
      calculation: output.calculation,
      confidence: output.confidence,
      holdReason: output.holdReason ?? null,
      estimatedValue:
        output.estimatedValueCents === null ? null : centsToDecimalString(output.estimatedValueCents),
      valueBasis: output.valueBasis,
      priorityScore: priority.score,
      priorityBand: priority.band,
      priorityRationale: priority.rationale,
      occurredAt: new Date(output.occurredAt),
      lastDetectedAt: now,
    };

    // The workflow status belongs to the people using the queue, not to the
    // engine. A re-run may move an untouched finding into HOLD when the data
    // has become contradictory, and otherwise leaves the status alone.
    const status = previous
      ? previous.status === "new" && output.confidence === "hold"
        ? "hold"
        : previous.status
      : output.confidence === "hold"
        ? "hold"
        : "new";

    const rows = await db()
      .insert(rrFindings)
      .values({ ...values, status, firstDetectedAt: now })
      .onConflictDoUpdate({
        target: [rrFindings.tenantId, rrFindings.findingKey],
        set: { ...values, status, resolvedAt: null, resolutionReason: null },
      })
      .returning({ id: rrFindings.id });

    const findingId = rows[0].id;
    if (previous) updated += 1;
    else created += 1;

    // Evidence is rewritten wholesale so it always reflects the run that
    // produced the current wording, never a mix of two passes.
    await db().delete(rrFindingEvidence).where(eq(rrFindingEvidence.findingId, findingId));
    if (output.evidence.length > 0) {
      await db()
        .insert(rrFindingEvidence)
        .values(
          output.evidence.map((item) => ({
            tenantId,
            findingId,
            sourceEntityType: item.entityType,
            sourceEntityId: item.entityId,
            label: item.label,
            evidenceJson: item.detail,
          })),
        );
    }
  }

  // Anything the rules that just ran did not re-emit no longer holds true.
  const producedKeys = new Set(outputs.map((o) => o.findingKey));
  const ranRuleIds = new Set(outputs.map((o) => o.ruleId));
  for (const id of ruleIds ?? []) ranRuleIds.add(id);

  const stale = existing.filter((row) => {
    if (!LIVE_STATUSES.includes(row.status)) return false;
    if (producedKeys.has(row.key)) return false;
    const ruleId = row.key.split(".")[0];
    // Only rules that actually ran may resolve their own findings.
    if (ruleIds && ruleIds.length > 0) return ruleIds.includes(ruleId);
    return failures.every((failure) => failure.ruleId !== ruleId);
  });

  if (stale.length > 0) {
    await db()
      .update(rrFindings)
      .set({ status: "resolved", resolvedAt: now, resolutionReason: "no_longer_detected" })
      .where(
        and(
          eq(rrFindings.tenantId, tenantId),
          inArray(
            rrFindings.id,
            stale.map((row) => row.id),
          ),
        ),
      );
  }

  await db()
    .update(rrRuleRuns)
    .set({
      finishedAt: new Date(),
      findingsCreated: created,
      findingsUpdated: updated,
      findingsResolved: stale.length,
    })
    .where(eq(rrRuleRuns.id, runId));

  await recordAudit({
    tenantId,
    actorUserId: context.viewer.id,
    eventType: "rules.run",
    entityType: "rule_run",
    entityId: runId,
    metadata: {
      rules: ruleIds ?? "all",
      created,
      updated,
      resolved: stale.length,
      failures,
    },
  });

  return { runId, created, updated, resolved: stale.length, failures };
}

/** Findings that are still live work, used by the queue and the dashboard. */
export function isOpen(finding: Pick<RrFinding, "status">): boolean {
  return LIVE_STATUSES.includes(finding.status);
}

export const OPEN_STATUSES = LIVE_STATUSES;

/** Used by the dashboard to exclude held findings from any claimed total. */
export const notHeld = () => not(eq(rrFindings.priorityBand, "hold"));
export const unresolved = () => isNull(rrFindings.resolvedAt);
