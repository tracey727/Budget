"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString, parseAmountInput } from "@/lib/money";
import type { FormState } from "./transactions";

const ACCOUNT_TYPES = [
  "transaction",
  "savings",
  "credit",
  "offset",
  "super",
  "investment",
  "cash",
  "loan",
] as const;

const accountSchema = z.object({
  name: z.string().trim().min(1, "Give the account a name.").max(80),
  type: z.enum(ACCOUNT_TYPES),
  institution: z.string().trim().max(80).optional(),
  openingBalance: z.string().optional(),
  isBusiness: z.boolean(),
});

export async function createAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = accountSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "transaction"),
    institution: String(formData.get("institution") ?? ""),
    openingBalance: String(formData.get("openingBalance") ?? "0"),
    isBusiness: formData.get("isBusiness") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  if (Number.isFinite(user.limits.accounts)) {
    const rows = await db()
      .select({ count: sql<string>`count(*)` })
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), eq(accounts.archived, false)));
    if (Number(rows[0]?.count ?? 0) >= user.limits.accounts) {
      return {
        error: `The Starter plan covers ${user.limits.accounts} accounts. Upgrade to add more.`,
      };
    }
  }

  const opening = parseAmountInput(parsed.data.openingBalance || "0") ?? 0;

  await db().insert(accounts).values({
    userId: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    institution: parsed.data.institution || null,
    openingBalance: centsToDecimalString(opening),
    isBusiness: user.limits.businessTools && parsed.data.isBusiness,
  });

  revalidatePath("/app/accounts");
  revalidatePath("/app");
  return { ok: true };
}

export async function archiveAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return;

  await db()
    .update(accounts)
    .set({ archived: true })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  revalidatePath("/app/accounts");
  revalidatePath("/app");
}
