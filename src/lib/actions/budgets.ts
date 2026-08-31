"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString, parseAmountInput } from "@/lib/money";
import { monthStart } from "@/lib/dates";
import { categoryIdsFor } from "@/lib/data/queries";
import type { FormState } from "./transactions";

const budgetSchema = z.object({
  categoryId: z.string().uuid("Choose a category."),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a month."),
  limitAmount: z.string().min(1, "Enter a budget amount."),
  rollover: z.boolean(),
});

export async function upsertBudgetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = budgetSchema.safeParse({
    categoryId: String(formData.get("categoryId") ?? ""),
    periodStart: String(formData.get("periodStart") ?? ""),
    limitAmount: String(formData.get("limitAmount") ?? ""),
    rollover: formData.get("rollover") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const period = monthStart(parsed.data.periodStart);
  const owned = await categoryIdsFor(user.id, [parsed.data.categoryId]);
  if (!owned.has(parsed.data.categoryId)) {
    return { error: "That category does not exist." };
  }

  const limitCents = parseAmountInput(parsed.data.limitAmount);
  if (limitCents === null || limitCents <= 0) {
    return { error: "Enter a budget amount like 400.00." };
  }

  // Only count against the plan limit when adding a new budget row, so
  // editing an existing budget never trips the cap.
  if (Number.isFinite(user.limits.budgets)) {
    const existing = await db()
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, user.id),
          eq(budgets.categoryId, parsed.data.categoryId),
          eq(budgets.periodStart, period),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      const rows = await db()
        .select({ count: sql<string>`count(*)` })
        .from(budgets)
        .where(and(eq(budgets.userId, user.id), eq(budgets.periodStart, period)));
      if (Number(rows[0]?.count ?? 0) >= user.limits.budgets) {
        return {
          error: `The Starter plan covers ${user.limits.budgets} budgets a month. Upgrade for unlimited budgets.`,
        };
      }
    }
  }

  await db()
    .insert(budgets)
    .values({
      userId: user.id,
      categoryId: parsed.data.categoryId,
      periodStart: period,
      limitAmount: centsToDecimalString(limitCents),
      rollover: parsed.data.rollover,
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.periodStart],
      set: {
        limitAmount: centsToDecimalString(limitCents),
        rollover: parsed.data.rollover,
      },
    });

  revalidatePath("/app/budgets");
  revalidatePath("/app");
  return { ok: true };
}

export async function deleteBudgetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db()
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)));

  revalidatePath("/app/budgets");
  revalidatePath("/app");
}
