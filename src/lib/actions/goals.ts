"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString, parseAmountInput, toCents } from "@/lib/money";
import type { FormState } from "./transactions";

const GOAL_KINDS = ["emergency", "home", "travel", "vehicle", "debt", "other"] as const;

const goalSchema = z.object({
  name: z.string().trim().min(1, "Name the goal.").max(80),
  targetAmount: z.string().min(1, "Enter a target amount."),
  savedAmount: z.string().optional(),
  targetDate: z.string().optional(),
  kind: z.enum(GOAL_KINDS),
});

export async function createGoalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = goalSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    targetAmount: String(formData.get("targetAmount") ?? ""),
    savedAmount: String(formData.get("savedAmount") ?? "0"),
    targetDate: String(formData.get("targetDate") ?? ""),
    kind: String(formData.get("kind") ?? "other"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (Number.isFinite(user.limits.goals)) {
    const rows = await db()
      .select({ count: sql<string>`count(*)` })
      .from(goals)
      .where(and(eq(goals.userId, user.id), eq(goals.archived, false)));
    if (Number(rows[0]?.count ?? 0) >= user.limits.goals) {
      return {
        error: `The Starter plan covers ${user.limits.goals} goal. Upgrade for unlimited goals.`,
      };
    }
  }

  const target = parseAmountInput(parsed.data.targetAmount);
  if (target === null || target <= 0) return { error: "Enter a target like 10000.00." };

  const saved = parseAmountInput(parsed.data.savedAmount || "0") ?? 0;

  await db().insert(goals).values({
    userId: user.id,
    name: parsed.data.name,
    targetAmount: centsToDecimalString(target),
    savedAmount: centsToDecimalString(Math.max(0, saved)),
    targetDate: parsed.data.targetDate || null,
    kind: parsed.data.kind,
  });

  revalidatePath("/app/goals");
  revalidatePath("/app");
  return { ok: true };
}

/** Adds (or subtracts, with a negative value) an amount against a goal. */
export async function contributeGoalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  const delta = parseAmountInput(String(formData.get("amount") ?? ""));
  if (delta === null || delta === 0) return;

  const rows = await db()
    .select({ saved: goals.savedAmount })
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)))
    .limit(1);

  const current = rows[0];
  if (!current) return;

  const next = Math.max(0, toCents(current.saved) + delta);

  await db()
    .update(goals)
    .set({ savedAmount: centsToDecimalString(next) })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));

  revalidatePath("/app/goals");
  revalidatePath("/app");
}

export async function archiveGoalAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db()
    .update(goals)
    .set({ archived: true })
    .where(and(eq(goals.id, id), eq(goals.userId, user.id)));

  revalidatePath("/app/goals");
  revalidatePath("/app");
}
