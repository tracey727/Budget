"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString, gstFromInclusive, parseAmountInput } from "@/lib/money";
import { countTransactions, ownsAccount } from "@/lib/data/queries";

export type FormState = { error?: string; ok?: boolean } | undefined;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.");

const transactionSchema = z.object({
  accountId: z.string().uuid("Choose an account."),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.string().min(1, "Enter an amount."),
  // "in" adds to the account, "out" subtracts.
  direction: z.enum(["in", "out"]),
  description: z.string().trim().min(1, "Add a description.").max(200),
  merchant: z.string().trim().max(120).optional(),
  occurredOn: isoDate,
  notes: z.string().trim().max(1000).optional(),
  isBusiness: z.boolean(),
  hasGst: z.boolean(),
});

function readForm(formData: FormData) {
  const rawCategory = formData.get("categoryId");
  return {
    accountId: String(formData.get("accountId") ?? ""),
    categoryId:
      typeof rawCategory === "string" && rawCategory !== "" ? rawCategory : null,
    amount: String(formData.get("amount") ?? ""),
    direction: String(formData.get("direction") ?? "out"),
    description: String(formData.get("description") ?? ""),
    merchant: String(formData.get("merchant") ?? ""),
    occurredOn: String(formData.get("occurredOn") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    isBusiness: formData.get("isBusiness") === "on",
    hasGst: formData.get("hasGst") === "on",
  };
}

/** Stable fingerprint so a re-imported statement does not double up rows. */
async function dedupeHash(parts: string[]): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(parts.join("|")),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createTransactionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = transactionSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const data = parsed.data;

  // Starter accounts are capped; the limit is checked server-side so the
  // client cannot bypass it by posting directly.
  if (Number.isFinite(user.limits.transactions)) {
    const used = await countTransactions(user.id);
    if (used >= user.limits.transactions) {
      return {
        error: `You have reached the ${user.limits.transactions} transaction limit on the Starter plan. Upgrade for unlimited transactions.`,
      };
    }
  }

  if (!(await ownsAccount(user.id, data.accountId))) {
    return { error: "That account does not exist." };
  }

  const magnitude = parseAmountInput(data.amount);
  if (magnitude === null || magnitude === 0) {
    return { error: "Enter an amount like 42.50." };
  }

  const signed = data.direction === "in" ? Math.abs(magnitude) : -Math.abs(magnitude);
  const isBusiness = user.limits.businessTools && data.isBusiness;
  const gstCents =
    isBusiness && data.hasGst ? gstFromInclusive(Math.abs(signed)) : null;

  const hash = await dedupeHash([
    user.id,
    data.accountId,
    data.occurredOn,
    String(signed),
    data.description.toLowerCase(),
  ]);

  await db()
    .insert(transactions)
    .values({
      userId: user.id,
      accountId: data.accountId,
      categoryId: data.categoryId,
      amount: centsToDecimalString(signed),
      description: data.description,
      merchant: data.merchant || null,
      occurredOn: data.occurredOn,
      notes: data.notes || null,
      isBusiness,
      gstAmount:
        gstCents === null
          ? null
          : centsToDecimalString(signed < 0 ? -gstCents : gstCents),
      dedupeHash: hash,
    })
    .onConflictDoNothing({ target: [transactions.userId, transactions.dedupeHash] });

  revalidatePath("/app");
  revalidatePath("/app/transactions");
  redirect("/app/transactions?added=1");
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db()
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/app");
  revalidatePath("/app/transactions");
}
