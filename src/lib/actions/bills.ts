"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { recurringBills } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString, parseAmountInput } from "@/lib/money";
import { advanceByFrequency } from "@/lib/dates";
import type { FormState } from "./transactions";

const FREQUENCIES = ["weekly", "fortnightly", "monthly", "quarterly", "yearly"] as const;

const billSchema = z.object({
  name: z.string().trim().min(1, "Name the bill.").max(80),
  amount: z.string().min(1, "Enter the amount."),
  frequency: z.enum(FREQUENCIES),
  nextDueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the next due date."),
  categoryId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  autoPay: z.boolean(),
});

export async function createBillAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  // Recurring bills are a paid feature; the gate is enforced server-side.
  if (!user.limits.reports) {
    return { error: "Recurring bills are part of Personal Premium. Upgrade to use them." };
  }

  const rawCategory = formData.get("categoryId");
  const rawAccount = formData.get("accountId");

  const parsed = billSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    frequency: String(formData.get("frequency") ?? "monthly"),
    nextDueOn: String(formData.get("nextDueOn") ?? ""),
    categoryId: typeof rawCategory === "string" && rawCategory ? rawCategory : null,
    accountId: typeof rawAccount === "string" && rawAccount ? rawAccount : null,
    autoPay: formData.get("autoPay") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const amount = parseAmountInput(parsed.data.amount);
  if (amount === null || amount <= 0) return { error: "Enter an amount like 120.00." };

  await db().insert(recurringBills).values({
    userId: user.id,
    name: parsed.data.name,
    amount: centsToDecimalString(amount),
    frequency: parsed.data.frequency,
    nextDueOn: parsed.data.nextDueOn,
    categoryId: parsed.data.categoryId,
    accountId: parsed.data.accountId,
    autoPay: parsed.data.autoPay,
  });

  revalidatePath("/app/bills");
  revalidatePath("/app");
  return { ok: true };
}

/** Marks a bill paid by rolling its due date forward one cycle. */
export async function markBillPaidAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  const rows = await db()
    .select({ nextDueOn: recurringBills.nextDueOn, frequency: recurringBills.frequency })
    .from(recurringBills)
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, user.id)))
    .limit(1);

  const bill = rows[0];
  if (!bill) return;

  await db()
    .update(recurringBills)
    .set({ nextDueOn: advanceByFrequency(bill.nextDueOn, bill.frequency) })
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, user.id)));

  revalidatePath("/app/bills");
  revalidatePath("/app");
}

export async function archiveBillAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db()
    .update(recurringBills)
    .set({ archived: true })
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, user.id)));

  revalidatePath("/app/bills");
  revalidatePath("/app");
}
