/**
 * CSV exports: findings, actions, recovery and audit.
 *
 * Exports are a permissioned action, not a convenience — they take customer
 * data out of the system, so the role is checked, the export itself is audited,
 * and a demonstration workspace says so in the filename.
 */

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  rrActions,
  rrAuditEvents,
  rrFindings,
  rrRecoveryEvents,
  users,
} from "@/lib/db/schema";
import { recordAudit } from "@/lib/rescue/audit";
import { csvBody } from "@/lib/rescue/csv-export";
import { getTenantContext } from "@/lib/rescue/tenant";
import { OPEN_STATUSES } from "@/lib/rescue/runner";
import { VALUE_BASIS_LABEL } from "@/lib/rescue/priority";
import { asValueBasis } from "@/lib/rescue/types";

export const dynamic = "force-dynamic";

const KINDS = ["findings", "actions", "recovery", "audit"] as const;
type Kind = (typeof KINDS)[number];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const { kind } = await params;
  if (!KINDS.includes(kind as Kind)) {
    return Response.json({ error: "unknown_export", message: "No such export." }, { status: 404 });
  }

  const context = await getTenantContext();
  if (!context) {
    return Response.json({ error: "no_workspace", message: "Sign in and select a workspace." }, { status: 401 });
  }
  if (!context.can("export")) {
    return Response.json(
      { error: "forbidden", message: "Your role cannot export data." },
      { status: 403 },
    );
  }
  if (kind === "audit" && !context.can("view_audit")) {
    return Response.json(
      { error: "forbidden", message: "Your role cannot export the audit trail." },
      { status: 403 },
    );
  }

  const tenantId = context.tenant.id;
  let headers: string[] = [];
  let rows: unknown[][] = [];

  if (kind === "findings") {
    const found = await db()
      .select()
      .from(rrFindings)
      .where(eq(rrFindings.tenantId, tenantId))
      .orderBy(desc(rrFindings.priorityScore));

    headers = [
      "finding_key", "rule_id", "rule_version", "rule_logic_hash", "title", "status",
      "priority_band", "priority_score", "confidence", "estimated_value", "value_basis",
      "value_basis_meaning", "hold_reason", "occurred_at", "first_detected_at",
      "last_detected_at", "resolved_at", "explanation", "calculation",
    ];
    rows = found.map((f) => [
      f.findingKey, f.ruleId, f.ruleVersion, f.ruleLogicHash, f.title, f.status,
      f.priorityBand, f.priorityScore, f.confidence, f.estimatedValue, f.valueBasis,
      VALUE_BASIS_LABEL[asValueBasis(f.valueBasis)], f.holdReason, f.occurredAt, f.firstDetectedAt,
      f.lastDetectedAt, f.resolvedAt, f.explanation, f.calculation,
    ]);
  }

  if (kind === "actions") {
    const found = await db()
      .select({ action: rrActions, finding: rrFindings, assignee: users.fullName })
      .from(rrActions)
      .innerJoin(rrFindings, eq(rrActions.findingId, rrFindings.id))
      .leftJoin(users, eq(rrActions.assignedTo, users.id))
      .where(and(eq(rrActions.tenantId, tenantId), inArray(rrFindings.status, OPEN_STATUSES)))
      .orderBy(asc(rrActions.dueAt));

    headers = [
      "finding_key", "rule_id", "title", "priority_band", "estimated_value", "value_basis",
      "assigned_to", "due_at", "action_status", "next_action", "created_at", "updated_at",
    ];
    rows = found.map(({ action, finding, assignee }) => [
      finding.findingKey, finding.ruleId, finding.title, finding.priorityBand,
      finding.estimatedValue, finding.valueBasis, assignee, action.dueAt, action.status,
      action.nextAction, action.createdAt, action.updatedAt,
    ]);
  }

  if (kind === "recovery") {
    const found = await db()
      .select({ event: rrRecoveryEvents, finding: rrFindings, confirmedBy: users.fullName })
      .from(rrRecoveryEvents)
      .innerJoin(rrFindings, eq(rrRecoveryEvents.findingId, rrFindings.id))
      .leftJoin(users, eq(rrRecoveryEvents.confirmedBy, users.id))
      .where(eq(rrRecoveryEvents.tenantId, tenantId))
      .orderBy(desc(rrRecoveryEvents.recoveryDate));

    headers = [
      "recovery_date", "amount", "is_reversal", "evidence_note", "confirmed_by",
      "finding_key", "rule_id", "finding_title", "estimated_value", "recorded_at",
    ];
    rows = found.map(({ event, finding, confirmedBy }) => [
      event.recoveryDate, event.amount, event.reversalOfId ? "yes" : "no", event.evidenceNote,
      confirmedBy, finding.findingKey, finding.ruleId, finding.title, finding.estimatedValue,
      event.createdAt,
    ]);
  }

  if (kind === "audit") {
    const found = await db()
      .select({ event: rrAuditEvents, actor: users.fullName, email: users.email })
      .from(rrAuditEvents)
      .leftJoin(users, eq(rrAuditEvents.actorUserId, users.id))
      .where(eq(rrAuditEvents.tenantId, tenantId))
      .orderBy(desc(rrAuditEvents.createdAt))
      .limit(10_000);

    headers = ["created_at", "event_type", "entity_type", "entity_id", "actor", "actor_email", "metadata"];
    rows = found.map(({ event, actor, email }) => [
      event.createdAt, event.eventType, event.entityType, event.entityId, actor, email,
      JSON.stringify(event.metadataJson ?? {}),
    ]);
  }

  await recordAudit({
    tenantId,
    actorUserId: context.viewer.id,
    eventType: "export.generated",
    entityType: "export",
    metadata: { kind, rows: rows.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = context.tenant.isDemo ? "DEMO-" : "";
  const filename = `${prefix}revenue-rescue-${kind}-${stamp}.csv`;

  return new Response(csvBody(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
