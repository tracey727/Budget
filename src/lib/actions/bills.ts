"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts, recurringBills, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString, parseAmountInput, toCents } from "@/lib/money";
import { advanceByFrequency, todayIso } from "@/lib/dates";
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

/**
 * Marks a bill paid.
 *
 * Two things happen, and the second is what makes the feature worth having:
 * the due date rolls forward one cycle, and — when the bill names the account
 * it comes out of — a matching transaction is written so the ledger shows the
 * money leaving. It is recorded as pending, because a bill marked paid today
 * has almost always not settled yet; the bank sync clears it, or the person
 * can. Bills paid from a linked account are left alone: the bank will report
 * the payment itself and writing it here too would double it up.
 */
export async function markBillPaidAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  const rows = await db()
    .select()
    .from(recurringBills)
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, user.id)))
    .limit(1);

  const bill = rows[0];
  if (!bill) return;

  const paidOn = todayIso();

  // A bill paid from a linked account will be reported by the bank within a
  // day or two; writing our own row as well would show the payment twice.
  const linked = bill.accountId
    ? await db()
        .select({ connectionId: accounts.connectionId })
        .from(accounts)
        .where(and(eq(accounts.id, bill.accountId), eq(accounts.userId, user.id)))
        .limit(1)
    : [];
  const accountIsLinked = Boolean(linked[0]?.connectionId);

  if (bill.accountId && !accountIsLinked) {
    const amountCents = -Math.abs(toCents(bill.amount));
    const hash = await paymentHash([
      user.id,
      bill.id,
      bill.nextDueOn,
      String(amountCents),
    ]);

    await db()
      .insert(transactions)
      .values({
        userId: user.id,
        accountId: bill.accountId,
        categoryId: bill.categoryId,
        amount: centsToDecimalString(amountCents),
        description: bill.name,
        occurredOn: paidOn,
        status: "pending",
        source: "manual",
        pendingSince: new Date(),
        // Keyed to this cycle, so pressing the button twice cannot pay twice.
        dedupeHash: hash,
      })
      .onConflictDoNothing({
        target: [transactions.userId, transactions.dedupeHash],
      });
  }

  await db()
    .update(recurringBills)
    .set({ nextDueOn: advanceByFrequency(bill.nextDueOn, bill.frequency) })
    .where(and(eq(recurringBills.id, id), eq(recurringBills.userId, user.id)));

  revalidatePath("/app/bills");
  revalidatePath("/app/transactions");
  revalidatePath("/app");
}

async function paymentHash(parts: string[]): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(parts.join("|")),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
