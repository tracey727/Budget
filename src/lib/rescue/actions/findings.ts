"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { rrActions, rrDismissals, rrFindings, rrMemberships, rrRecoveryEvents } from "@/lib/db/schema";
import { centsToDecimalString, parseAmountInput, toCents } from "@/lib/money";
import { recordAudit } from "@/lib/rescue/audit";
import { checkRecovery, fullyRecovered } from "@/lib/rescue/recovery";
import { requireCapability } from "@/lib/rescue/tenant";
import { centsOf } from "@/lib/rescue/types";

import type { FormState } from "./types";

/** Every mutation starts here: the finding must belong to this workspace. */
async function findingFor(tenantId: string, findingId: string) {
  const rows = await db()
    .select()
    .from(rrFindings)
    .where(and(eq(rrFindings.id, findingId), eq(rrFindings.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

async function currentAction(tenantId: string, findingId: string) {
  const rows = await db()
    .select()
    .from(rrActions)
    .where(and(eq(rrActions.findingId, findingId), eq(rrActions.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

const assignSchema = z.object({
  findingId: z.string().uuid(),
  assignedTo: z.string().uuid().or(z.literal("")),
  dueAt: z.string(),
  nextAction: z.string().trim().max(500),
});

/**
 * Assignment, due date and next action in one step.
 *
 * They travel together because an assignment with no due date and no stated
 * next action is how a queue quietly stops being worked.
 */
export async function saveActionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("assign");

  const parsed = assignSchema.safeParse({
    findingId: String(formData.get("findingId") ?? ""),
    assignedTo: String(formData.get("assignedTo") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    nextAction: String(formData.get("nextAction") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const finding = await findingFor(context.tenant.id, parsed.data.findingId);
  if (!finding) return { error: "That finding is not in this workspace." };

  // An assignee must be a member of this workspace — never an arbitrary user ID.
  let assignedTo: string | null = null;
  if (parsed.data.assignedTo !== "") {
    const member = await db()
      .select({ userId: rrMemberships.userId })
      .from(rrMemberships)
      .where(
        and(
          eq(rrMemberships.tenantId, context.tenant.id),
          eq(rrMemberships.userId, parsed.data.assignedTo),
          eq(rrMemberships.status, "active"),
        ),
      )
      .limit(1);
    if (!member[0]) return { error: "That person is not a member of this workspace." };
    assignedTo = member[0].userId;
  }

  const dueAt = parsed.data.dueAt === "" ? null : new Date(`${parsed.data.dueAt}T17:00:00`);
  if (dueAt && Number.isNaN(dueAt.getTime())) return { error: "That due date could not be read." };

  const existing = await currentAction(context.tenant.id, finding.id);
  const now = new Date();

  if (existing) {
    await db()
      .update(rrActions)
      .set({
        assignedTo,
        dueAt,
        nextAction: parsed.data.nextAction || null,
        updatedAt: now,
      })
      .where(and(eq(rrActions.id, existing.id), eq(rrActions.tenantId, context.tenant.id)));
  } else {
    await db().insert(rrActions).values({
      tenantId: context.tenant.id,
      findingId: finding.id,
      assignedTo,
      dueAt,
      nextAction: parsed.data.nextAction || null,
      status: "open",
      createdBy: context.viewer.id,
    });
  }

  // Picking a finding up is itself progress worth showing in the queue.
  if (finding.status === "new") {
    await db()
      .update(rrFindings)
      .set({ status: "reviewing" })
      .where(and(eq(rrFindings.id, finding.id), eq(rrFindings.tenantId, context.tenant.id)));
  }

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: existing ? "action.updated" : "action.created",
    entityType: "finding",
    entityId: finding.id,
    metadata: { assignedTo, dueAt: dueAt?.toISOString() ?? null, nextAction: parsed.data.nextAction || null },
  });

  revalidatePath(`/rescue/findings/${finding.id}`);
  revalidatePath("/rescue/queue");
  return { ok: true, message: "Saved." };
}

const statusSchema = z.object({
  findingId: z.string().uuid(),
  status: z.enum(["new", "reviewing", "actioned", "resolved", "hold"]),
  note: z.string().trim().max(500).optional(),
});

export async function setFindingStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("progress");

  const parsed = statusSchema.safeParse({
    findingId: String(formData.get("findingId") ?? ""),
    status: String(formData.get("status") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) return { error: "That status is not one this finding can take." };

  const finding = await findingFor(context.tenant.id, parsed.data.findingId);
  if (!finding) return { error: "That finding is not in this workspace." };
  if (finding.status === "dismissed") return { error: "That finding has been dismissed." };

  const now = new Date();
  await db()
    .update(rrFindings)
    .set({
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "resolved" ? now : null,
      resolutionReason: parsed.data.status === "resolved" ? (parsed.data.note || "closed_by_user") : null,
    })
    .where(and(eq(rrFindings.id, finding.id), eq(rrFindings.tenantId, context.tenant.id)));

  if (parsed.data.status === "resolved" || parsed.data.status === "actioned") {
    const action = await currentAction(context.tenant.id, finding.id);
    if (action) {
      await db()
        .update(rrActions)
        .set({ status: parsed.data.status === "resolved" ? "done" : "in_progress", updatedAt: now })
        .where(and(eq(rrActions.id, action.id), eq(rrActions.tenantId, context.tenant.id)));
    }
  }

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: parsed.data.status === "hold" ? "finding.hold" : "finding.status_changed",
    entityType: "finding",
    entityId: finding.id,
    metadata: { from: finding.status, to: parsed.data.status, note: parsed.data.note || null },
  });

  revalidatePath(`/rescue/findings/${finding.id}`);
  revalidatePath("/rescue/queue");
  revalidatePath("/rescue/findings");
  return { ok: true, message: "Status updated." };
}

const DISMISS_REASONS = [
  "not_leakage",
  "already_handled",
  "data_error",
  "policy_decision",
  "duplicate_finding",
  "other",
] as const;

const dismissSchema = z.object({
  findingId: z.string().uuid(),
  reasonCode: z.enum(DISMISS_REASONS),
  reasonNote: z.string().trim().min(5, "Say why in a sentence — this is kept in the audit trail."),
});

/** Dismissal always requires a reason. That is the whole point of the control. */
export async function dismissFindingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("dismiss");

  const parsed = dismissSchema.safeParse({
    findingId: String(formData.get("findingId") ?? ""),
    reasonCode: String(formData.get("reasonCode") ?? ""),
    reasonNote: String(formData.get("reasonNote") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a reason and explain it." };

  const finding = await findingFor(context.tenant.id, parsed.data.findingId);
  if (!finding) return { error: "That finding is not in this workspace." };

  await db().insert(rrDismissals).values({
    tenantId: context.tenant.id,
    findingId: finding.id,
    reasonCode: parsed.data.reasonCode,
    reasonNote: parsed.data.reasonNote,
    dismissedBy: context.viewer.id,
  });

  await db()
    .update(rrFindings)
    .set({ status: "dismissed", resolvedAt: new Date(), resolutionReason: parsed.data.reasonCode })
    .where(and(eq(rrFindings.id, finding.id), eq(rrFindings.tenantId, context.tenant.id)));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "finding.dismissed",
    entityType: "finding",
    entityId: finding.id,
    metadata: { reasonCode: parsed.data.reasonCode, reasonNote: parsed.data.reasonNote },
  });

  revalidatePath(`/rescue/findings/${finding.id}`);
  revalidatePath("/rescue/findings");
  revalidatePath("/rescue/queue");
  return { ok: true, message: "Finding dismissed, with the reason recorded." };
}

const recoverySchema = z.object({
  findingId: z.string().uuid(),
  amount: z.string().min(1, "Enter the amount recovered."),
  recoveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date the money was received."),
  evidenceNote: z.string().trim().min(5, "Note the evidence — a receipt number, invoice or a sentence."),
});

/**
 * Recording confirmed recovery.
 *
 * Confirmed money is kept strictly apart from estimated value, partial
 * recoveries are normal, and the total may not exceed what the finding
 * estimated — if it would, something is being counted twice and the person is
 * told rather than the number quietly growing.
 */
export async function recordRecoveryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("record_recovery");

  const parsed = recoverySchema.safeParse({
    findingId: String(formData.get("findingId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    recoveryDate: String(formData.get("recoveryDate") ?? ""),
    evidenceNote: String(formData.get("evidenceNote") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const finding = await findingFor(context.tenant.id, parsed.data.findingId);
  if (!finding) return { error: "That finding is not in this workspace." };

  const amountCents = parseAmountInput(parsed.data.amount);
  if (amountCents === null) return { error: "Enter an amount like 252.99." };

  const already = await db()
    .select({ total: sql<string>`coalesce(sum(${rrRecoveryEvents.amount}), 0)` })
    .from(rrRecoveryEvents)
    .where(
      and(eq(rrRecoveryEvents.findingId, finding.id), eq(rrRecoveryEvents.tenantId, context.tenant.id)),
    );

  const alreadyCents = toCents(already[0]?.total ?? "0");
  const estimatedCents = centsOf(finding.estimatedValue);

  const check = checkRecovery({
    held: finding.priorityBand === "hold" || finding.confidence === "hold",
    estimatedCents,
    alreadyCents,
    amountCents,
  });
  if (!check.ok) return { error: check.message };

  await db().insert(rrRecoveryEvents).values({
    tenantId: context.tenant.id,
    findingId: finding.id,
    amount: centsToDecimalString(amountCents),
    recoveryDate: parsed.data.recoveryDate,
    evidenceNote: parsed.data.evidenceNote,
    confirmedBy: context.viewer.id,
  });

  const nowRecovered = alreadyCents + amountCents;
  const fully = fullyRecovered(estimatedCents, nowRecovered);

  if (fully) {
    await db()
      .update(rrFindings)
      .set({ status: "resolved", resolvedAt: new Date(), resolutionReason: "recovered" })
      .where(and(eq(rrFindings.id, finding.id), eq(rrFindings.tenantId, context.tenant.id)));
  } else if (finding.status === "new" || finding.status === "reviewing") {
    await db()
      .update(rrFindings)
      .set({ status: "actioned" })
      .where(and(eq(rrFindings.id, finding.id), eq(rrFindings.tenantId, context.tenant.id)));
  }

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "recovery.recorded",
    entityType: "finding",
    entityId: finding.id,
    metadata: {
      amount: centsToDecimalString(amountCents),
      recoveryDate: parsed.data.recoveryDate,
      note: parsed.data.evidenceNote,
      totalRecovered: centsToDecimalString(nowRecovered),
    },
  });

  revalidatePath(`/rescue/findings/${finding.id}`);
  revalidatePath("/rescue");
  return {
    ok: true,
    message: fully
      ? "Recovery confirmed. The finding is now fully recovered and resolved."
      : "Recovery confirmed.",
  };
}

const reversalSchema = z.object({
  recoveryId: z.string().uuid(),
  reasonNote: z.string().trim().min(5, "Say why this is being reversed."),
});

/**
 * Reversing a recovery.
 *
 * The original event is never edited or deleted. A reversal is posted against
 * it, so the history shows what was claimed, when, and that it was withdrawn.
 */
export async function reverseRecoveryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("record_recovery");

  const parsed = reversalSchema.safeParse({
    recoveryId: String(formData.get("recoveryId") ?? ""),
    reasonNote: String(formData.get("reasonNote") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const rows = await db()
    .select()
    .from(rrRecoveryEvents)
    .where(
      and(
        eq(rrRecoveryEvents.id, parsed.data.recoveryId),
        eq(rrRecoveryEvents.tenantId, context.tenant.id),
      ),
    )
    .limit(1);

  const original = rows[0];
  if (!original) return { error: "That recovery entry is not in this workspace." };
  if (original.reversalOfId) return { error: "That entry is itself a reversal." };

  const existingReversal = await db()
    .select({ id: rrRecoveryEvents.id })
    .from(rrRecoveryEvents)
    .where(
      and(eq(rrRecoveryEvents.reversalOfId, original.id), eq(rrRecoveryEvents.tenantId, context.tenant.id)),
    )
    .limit(1);
  if (existingReversal[0]) return { error: "That recovery has already been reversed." };

  await db().insert(rrRecoveryEvents).values({
    tenantId: context.tenant.id,
    findingId: original.findingId,
    amount: centsToDecimalString(-toCents(original.amount)),
    recoveryDate: original.recoveryDate,
    evidenceNote: `Reversal: ${parsed.data.reasonNote}`,
    reversalOfId: original.id,
    confirmedBy: context.viewer.id,
  });

  await db()
    .update(rrFindings)
    .set({ status: "reviewing", resolvedAt: null, resolutionReason: null })
    .where(and(eq(rrFindings.id, original.findingId), eq(rrFindings.tenantId, context.tenant.id)));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "recovery.reversed",
    entityType: "finding",
    entityId: original.findingId,
    metadata: { reversed: original.id, amount: original.amount, note: parsed.data.reasonNote },
  });

  revalidatePath(`/rescue/findings/${original.findingId}`);
  revalidatePath("/rescue");
  return { ok: true, message: "Recovery reversed. The original entry is kept in the history." };
}
