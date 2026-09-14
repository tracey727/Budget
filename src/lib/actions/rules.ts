"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, categoryRules, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import type { FormState } from "./transactions";

const ruleSchema = z.object({
  pattern: z.string().trim().min(2, "Enter at least two characters to match on.").max(80),
  matchType: z.enum(["contains", "starts_with", "equals"]),
  categoryId: z.string().uuid("Choose a category."),
  renameTo: z.string().trim().max(120).optional(),
  markBusiness: z.boolean(),
});

export async function createRuleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  if (!user.limits.csvImport) {
    return {
      error:
        "Automatic categorisation is part of Personal Premium. Upgrade to set rules.",
    };
  }

  const parsed = ruleSchema.safeParse({
    pattern: String(formData.get("pattern") ?? ""),
    matchType: String(formData.get("matchType") ?? "contains"),
    categoryId: String(formData.get("categoryId") ?? ""),
    renameTo: String(formData.get("renameTo") ?? ""),
    markBusiness: formData.get("markBusiness") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  // The category has to be the person's own; a uuid from elsewhere would
  // otherwise file their groceries into a stranger's chart of accounts.
  const owned = await db()
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, parsed.data.categoryId),
        eq(categories.userId, user.id),
      ),
    )
    .limit(1);
  if (owned.length === 0) return { error: "Choose a category." };

  await db().insert(categoryRules).values({
    userId: user.id,
    pattern: parsed.data.pattern,
    matchType: parsed.data.matchType,
    categoryId: parsed.data.categoryId,
    renameTo: parsed.data.renameTo || null,
    markBusiness: parsed.data.markBusiness,
  });

  revalidatePath("/app/rules");
  return { ok: true };
}

export async function deleteRuleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db()
    .delete(categoryRules)
    .where(and(eq(categoryRules.id, id), eq(categoryRules.userId, user.id)));

  revalidatePath("/app/rules");
}

/**
 * Applies a rule to transactions already in the ledger.
 *
 * New rules usually come from looking at an uncategorised list, so the useful
 * thing is to fix that list rather than only future imports. Only
 * uncategorised rows are touched — a rule should never overwrite a choice
 * somebody made by hand.
 */
export async function applyRuleToPastAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  const rows = await db()
    .select()
    .from(categoryRules)
    .where(and(eq(categoryRules.id, id), eq(categoryRules.userId, user.id)))
    .limit(1);

  const rule = rows[0];
  if (!rule) return;

  const needle = rule.pattern.toLowerCase();
  const term =
    rule.matchType === "starts_with"
      ? `${needle}%`
      : rule.matchType === "equals"
        ? needle
        : `%${needle}%`;

  const matches = await db()
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        sql`${transactions.categoryId} is null`,
        sql`(lower(${transactions.description}) like ${term} or lower(coalesce(${transactions.merchant}, '')) like ${term})`,
      ),
    )
    .limit(2000);

  if (matches.length === 0) return;

  await db()
    .update(transactions)
    .set({
      categoryId: rule.categoryId,
      isBusiness: rule.markBusiness,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.userId, user.id),
        inArray(
          transactions.id,
          matches.map((row) => row.id),
        ),
      ),
    );

  await db()
    .update(categoryRules)
    .set({ timesApplied: rule.timesApplied + matches.length })
    .where(eq(categoryRules.id, rule.id));

  revalidatePath("/app/rules");
  revalidatePath("/app/transactions");
  revalidatePath("/app");
}
