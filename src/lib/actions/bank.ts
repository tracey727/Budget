"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts, bankConnections, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { appUrl } from "@/lib/env";
import { activeProvider, activeProviderKey, providerFor } from "@/lib/bank/provider";
import { syncConnection, syncUser } from "@/lib/bank/sync";
import { BankProviderError } from "@/lib/bank/types";

export type BankState = { error?: string; ok?: string } | undefined;

const uuid = z.string().uuid();

/**
 * Starts a consent flow.
 *
 * Nothing is written until the provider hands back a handle, and the row is
 * created as `pending` so a person who abandons the bank's screen does not end
 * up with a link that looks connected.
 */
export async function connectBankAction(
  _prev: BankState,
  formData: FormData,
): Promise<BankState> {
  const user = await requireUser();

  if (!user.limits.bankFeed) {
    return {
      error:
        "Connecting a bank is part of Personal Premium. Upgrade to link your accounts.",
    };
  }
  if (!user.emailVerifiedAt) {
    return {
      error:
        "Verify your email address before connecting a bank — it is how we reach you about your accounts.",
    };
  }

  const institutionId = String(formData.get("institutionId") ?? "") || undefined;
  const provider = activeProvider();

  let session;
  try {
    session = await provider.startConsent({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      institutionId,
      returnUrl: `${appUrl()}/api/bank/callback`,
    });
  } catch (error) {
    return {
      error:
        error instanceof BankProviderError
          ? error.message
          : "The bank connection service could not be reached. Try again shortly.",
    };
  }

  // Consent flows that were started and abandoned would otherwise sit in the
  // way: the provisional handle is derived from the person, so a retry would
  // collide with the row from the attempt they walked away from.
  await db()
    .delete(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, user.id),
        eq(bankConnections.status, "pending"),
        lt(bankConnections.createdAt, new Date(Date.now() - 60_000)),
      ),
    );

  const institutions = await provider.listInstitutions().catch(() => []);
  const institutionName =
    institutions.find((row) => row.id === institutionId)?.name ??
    (provider.live ? "Your bank" : "Demo Bank");

  await db()
    .insert(bankConnections)
    .values({
      userId: user.id,
      provider: activeProviderKey(),
      providerConnectionId: session.ref.providerConnectionId,
      providerUserId: session.ref.providerUserId,
      institutionId: institutionId ?? null,
      institutionName,
      status: "pending",
      consentExpiresAt: session.expiresAt,
    })
    .onConflictDoNothing({
      target: [bankConnections.provider, bankConnections.providerConnectionId],
    });

  redirect(session.url);
}

/** Pulls one connection, or all of them, on demand. */
export async function syncBankAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("connectionId") ?? "");

  if (id && uuid.safeParse(id).success) {
    const rows = await db()
      .select()
      .from(bankConnections)
      .where(
        and(eq(bankConnections.id, id), eq(bankConnections.userId, user.id)),
      )
      .limit(1);
    if (rows[0]) await syncConnection(rows[0], "manual");
  } else {
    await syncUser(user.id, "manual");
  }

  revalidatePath("/app");
  revalidatePath("/app/bank");
  revalidatePath("/app/accounts");
  revalidatePath("/app/transactions");
}

/**
 * Disconnects a bank.
 *
 * Consent is revoked at the provider, and the transactions already imported
 * are kept — they are the person's financial history, not the provider's. The
 * mirrored accounts stay too, but stop syncing, so balances freeze at their
 * last known value rather than disappearing.
 */
export async function disconnectBankAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("connectionId") ?? "");
  if (!uuid.safeParse(id).success) return;

  const rows = await db()
    .select()
    .from(bankConnections)
    .where(and(eq(bankConnections.id, id), eq(bankConnections.userId, user.id)))
    .limit(1);

  const connection = rows[0];
  if (!connection) return;

  await providerFor(connection.provider)
    .revoke({
      providerConnectionId: connection.providerConnectionId,
      providerUserId: connection.providerUserId,
    })
    .catch(() => {
      // The link is being torn down either way; a provider that is already
      // unaware of it is the outcome we wanted.
    });

  await db()
    .update(bankConnections)
    .set({ status: "revoked", lastError: null, updatedAt: new Date() })
    .where(eq(bankConnections.id, connection.id));

  await db()
    .update(accounts)
    .set({ syncEnabled: false })
    .where(
      and(eq(accounts.userId, user.id), eq(accounts.connectionId, connection.id)),
    );

  revalidatePath("/app/bank");
  revalidatePath("/app/accounts");
}

/** Turns syncing on or off for a single mirrored account. */
export async function toggleAccountSyncAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("accountId") ?? "");
  if (!uuid.safeParse(id).success) return;

  const rows = await db()
    .select({ syncEnabled: accounts.syncEnabled })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)))
    .limit(1);
  if (!rows[0]) return;

  await db()
    .update(accounts)
    .set({ syncEnabled: !rows[0].syncEnabled })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  revalidatePath("/app/bank");
}

/**
 * Marks a pending transaction as cleared by hand.
 *
 * Sometimes a bank settles something without ever reporting it — a cash
 * withdrawal, or an account that is not linked. This is the escape hatch, and
 * it is recorded as a manual clear so a later sync does not fight it.
 */
export async function clearTransactionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  await db()
    .update(transactions)
    .set({ status: "posted", clearedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, user.id),
        eq(transactions.status, "pending"),
      ),
    );

  revalidatePath("/app");
  revalidatePath("/app/transactions");
}

/** Puts a transaction back to pending — the undo for the action above. */
export async function markPendingAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return;

  await db()
    .update(transactions)
    .set({
      status: "pending",
      clearedAt: null,
      pendingSince: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/app");
  revalidatePath("/app/transactions");
}
