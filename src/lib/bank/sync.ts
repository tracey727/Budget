/**
 * Pulling a bank connection into the ledger.
 *
 * One pass does four things, in order, so that a failure part way through
 * leaves the ledger consistent rather than half-updated:
 *
 *   1. mirror the bank's accounts, creating local ones the first time
 *   2. reconcile the transaction window (see `reconcile.ts`)
 *   3. write the bank's own balances alongside the ledger's
 *   4. raise alerts for what actually changed
 *
 * Every pass is recorded in `bank_sync_runs`, so "why is my balance stale?" has
 * an answer in the interface instead of in the logs.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  bankConnections,
  bankSyncRuns,
  categories,
  categoryRules,
  transactions,
  type BankConnection,
} from "@/lib/db/schema";
import { centsToDecimalString, formatMoney, toCents } from "@/lib/money";
import { addDays, todayIso } from "@/lib/dates";
import { raiseAlerts, type NewAlert } from "@/lib/alerts";
import { providerFor } from "./provider";
import { reconcile, type IncomingRow, type LedgerRow } from "./reconcile";
import { applyRules, suggestCategoryName, type Rule } from "./rules";
import { BankProviderError, type BankConnectionRef } from "./types";

/** How far back a first sync reaches. CDR data generally goes back a year. */
const BACKFILL_DAYS = 180;
/** How far back later syncs re-read, to catch revisions and late settlements. */
const REFRESH_DAYS = 21;
/** Flag a debit this large as worth a look. */
const LARGE_TRANSACTION_CENTS = 50_000;
/** Warn when what is actually spendable falls below this. */
const LOW_BALANCE_CENTS = 10_000;

export type SyncTrigger = "manual" | "webhook" | "schedule" | "connect";

export type SyncResult = {
  connectionId: string;
  institutionName: string;
  status: "ok" | "error";
  accountsSynced: number;
  added: number;
  updated: number;
  cleared: number;
  dropped: number;
  error?: string;
};

function refOf(connection: BankConnection): BankConnectionRef {
  return {
    providerConnectionId: connection.providerConnectionId,
    providerUserId: connection.providerUserId,
  };
}

/** Syncs one connection. Never throws for provider faults — it records them. */
export async function syncConnection(
  connection: BankConnection,
  trigger: SyncTrigger = "manual",
): Promise<SyncResult> {
  const provider = providerFor(connection.provider);
  const runs = await db()
    .insert(bankSyncRuns)
    .values({
      userId: connection.userId,
      connectionId: connection.id,
      trigger,
      status: "running",
    })
    .returning({ id: bankSyncRuns.id });
  const runId = runs[0]?.id;

  const result: SyncResult = {
    connectionId: connection.id,
    institutionName: connection.institutionName,
    status: "ok",
    accountsSynced: 0,
    added: 0,
    updated: 0,
    cleared: 0,
    dropped: 0,
  };

  try {
    const ref = refOf(connection);
    const state = await provider.getConnection(ref);

    if (state.status !== "active") {
      await markConnection(connection.id, {
        status: state.status,
        lastError: state.error,
      });

      if (state.status === "action_needed" || state.status === "expired") {
        await raiseAlerts(connection.userId, [
          {
            kind: "connection_action",
            severity: "warning",
            title: `${connection.institutionName} needs attention`,
            body:
              state.status === "expired"
                ? "The consent for this bank connection has expired. Reconnect it to keep balances up to date."
                : "Your bank is asking you to confirm this connection again before it will send more data.",
            href: "/app/bank",
            dedupeKey: `connection:${connection.id}:${state.status}`,
          },
        ]);
      }

      throw new BankProviderError(
        state.error ?? `The connection is ${state.status.replace("_", " ")}.`,
      );
    }

    /* ---------------------------- 1. accounts ---------------------------- */

    const snapshots = await provider.listAccounts(ref);
    const accountIdByProviderId = await mirrorAccounts(connection, snapshots);
    result.accountsSynced = accountIdByProviderId.size;

    /* -------------------------- 2. transactions -------------------------- */

    const since =
      connection.backfilledFrom ?? addDays(todayIso(), -BACKFILL_DAYS);
    const window = connection.lastSyncedAt
      ? addDays(todayIso(), -REFRESH_DAYS)
      : since;

    const fetched = await provider.listTransactions(ref, window);

    const incoming: IncomingRow[] = [];
    for (const row of fetched) {
      const accountId = accountIdByProviderId.get(row.providerAccountId);
      // A transaction on an account the person has not linked is not an error;
      // it simply is not theirs to see here.
      if (!accountId) continue;
      incoming.push({ ...row, accountId });
    }

    const existing = await loadLedgerWindow(
      connection.userId,
      [...accountIdByProviderId.values()],
      window,
    );

    const plan = reconcile({ existing, incoming, now: Date.now() });

    const rules = await loadRules(connection.userId);
    const categoryByName = await loadCategoryNames(connection.userId);

    const alerts: NewAlert[] = [];

    /* ------------------------------ inserts ------------------------------ */

    if (plan.inserts.length > 0) {
      const values = plan.inserts.map((row) =>
        buildInsert(connection, row, rules, categoryByName),
      );
      const CHUNK = 400;
      for (let i = 0; i < values.length; i += CHUNK) {
        const written = await db()
          .insert(transactions)
          .values(values.slice(i, i + CHUNK))
          .onConflictDoNothing({
            target: [transactions.userId, transactions.providerTransactionId],
          })
          .returning({ id: transactions.id });
        result.added += written.length;
      }

      for (const row of plan.inserts) {
        if (row.status === "pending") {
          alerts.push({
            kind: "transaction_pending",
            severity: "info",
            title: `${formatMoney(Math.abs(row.amountCents))} pending at ${row.merchant ?? shorten(row.description)}`,
            body: "Your bank has authorised this but not settled it yet. It is already deducted from what is safe to spend.",
            href: "/app/transactions?status=pending",
            amountCents: row.amountCents,
            dedupeKey: `pending:${row.providerTransactionId}`,
          });
        } else if (row.amountCents <= -LARGE_TRANSACTION_CENTS) {
          alerts.push({
            kind: "large_transaction",
            severity: "warning",
            title: `${formatMoney(Math.abs(row.amountCents))} left your account`,
            body: `${shorten(row.description)} cleared on ${row.clearedOn ?? row.occurredOn}.`,
            href: "/app/transactions",
            amountCents: row.amountCents,
            dedupeKey: `large:${row.providerTransactionId}`,
          });
        }
      }
    }

    /* ------------------------------ updates ------------------------------ */

    for (const change of plan.updates) {
      await db()
        .update(transactions)
        .set({
          amount: centsToDecimalString(change.incoming.amountCents),
          description: change.incoming.description,
          merchant: change.incoming.merchant,
          occurredOn: change.incoming.occurredOn,
          status: change.incoming.status,
          providerPayload: change.incoming.raw ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.id, change.id),
            eq(transactions.userId, connection.userId),
          ),
        );
      result.updated += 1;
    }

    /* ------------------------------- clears ------------------------------ */

    for (const settled of plan.clears) {
      await db()
        .update(transactions)
        .set({
          status: "posted",
          amount: centsToDecimalString(settled.incoming.amountCents),
          description: settled.incoming.description,
          merchant: settled.incoming.merchant,
          occurredOn: settled.incoming.occurredOn,
          clearedAt: new Date(),
          providerTransactionId: settled.incoming.providerTransactionId,
          settledPendingId: settled.replacedProviderTransactionId,
          providerPayload: settled.incoming.raw ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.id, settled.id),
            eq(transactions.userId, connection.userId),
          ),
        );
      result.cleared += 1;

      const finalCents = settled.incoming.amountCents;
      const movedBy = Math.abs(finalCents) - Math.abs(settled.previousAmountCents);
      alerts.push({
        kind: "transaction_cleared",
        severity: "info",
        title: `${formatMoney(Math.abs(finalCents))} cleared — ${settled.incoming.merchant ?? shorten(settled.incoming.description)}`,
        body:
          movedBy === 0
            ? "Your bank has settled this payment. Your cleared balance now includes it."
            : `Your bank settled this at ${formatMoney(Math.abs(finalCents))}, ${movedBy > 0 ? "more" : "less"} than the ${formatMoney(Math.abs(settled.previousAmountCents))} it held.`,
        href: "/app/transactions",
        amountCents: finalCents,
        dedupeKey: `cleared:${settled.incoming.providerTransactionId}`,
      });
    }

    /* ------------------------------- drops ------------------------------- */

    if (plan.drops.length > 0) {
      await db()
        .update(transactions)
        .set({ status: "declined", updatedAt: new Date() })
        .where(
          and(
            eq(transactions.userId, connection.userId),
            inArray(
              transactions.id,
              plan.drops.map((drop) => drop.id),
            ),
          ),
        );
      result.dropped = plan.drops.length;

      for (const drop of plan.drops) {
        alerts.push({
          kind: "transaction_dropped",
          severity: "info",
          title: `A ${formatMoney(Math.abs(drop.amountCents))} hold was released`,
          body: `${shorten(drop.description)} never settled, so your bank has released the hold. That money is available again.`,
          href: "/app/transactions?status=declined",
          amountCents: drop.amountCents,
          dedupeKey: `dropped:${drop.id}`,
        });
      }
    }

    /* ----------------------------- 3. balances --------------------------- */

    await alignOpeningBalances(connection.userId, snapshots, accountIdByProviderId);
    await raiseBalanceAlerts(connection, snapshots, accountIdByProviderId, alerts);

    /* ------------------------------ 4. alerts ---------------------------- */

    await raiseAlerts(connection.userId, alerts);

    await markConnection(connection.id, {
      status: "active",
      lastError: null,
      lastSyncedAt: new Date(),
      backfilledFrom: connection.backfilledFrom ?? since,
    });
  } catch (error) {
    result.status = "error";
    result.error =
      error instanceof BankProviderError
        ? error.message
        : "The bank could not be reached. The next scheduled sync will try again.";

    await markConnection(connection.id, { lastError: result.error });

    await raiseAlerts(connection.userId, [
      {
        kind: "sync_failed",
        severity: "warning",
        title: `Could not refresh ${connection.institutionName}`,
        body: result.error,
        href: "/app/bank",
        // One alert per day per connection: a failing link should not fill
        // the list with an entry per scheduled attempt.
        dedupeKey: `sync_failed:${connection.id}:${todayIso()}`,
      },
    ]);
  }

  if (runId) {
    await db()
      .update(bankSyncRuns)
      .set({
        status: result.status,
        accountsSynced: result.accountsSynced,
        added: result.added,
        updated: result.updated,
        cleared: result.cleared,
        dropped: result.dropped,
        error: result.error ?? null,
        finishedAt: new Date(),
      })
      .where(eq(bankSyncRuns.id, runId));
  }

  return result;
}

/** Syncs every active connection a person has. */
export async function syncUser(
  userId: string,
  trigger: SyncTrigger = "manual",
): Promise<SyncResult[]> {
  const links = await db()
    .select()
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.userId, userId),
        inArray(bankConnections.status, ["active", "action_needed", "error"]),
      ),
    );

  const results: SyncResult[] = [];
  for (const link of links) {
    results.push(await syncConnection(link, trigger));
  }
  return results;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function shorten(text: string): string {
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

async function markConnection(
  id: string,
  patch: Partial<{
    status: string;
    lastError: string | null;
    lastSyncedAt: Date;
    backfilledFrom: string;
  }>,
): Promise<void> {
  await db()
    .update(bankConnections)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(bankConnections.id, id));
}

/**
 * Creates or refreshes the local account mirroring each bank account.
 *
 * Balances are stored exactly as the bank reported them; the ledger is brought
 * into agreement separately, by `alignOpeningBalances`, once the transaction
 * window has been reconciled.
 */
async function mirrorAccounts(
  connection: BankConnection,
  snapshots: Awaited<ReturnType<ReturnType<typeof providerFor>["listAccounts"]>>,
): Promise<Map<string, string>> {
  const existing = await db()
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, connection.userId),
        eq(accounts.connectionId, connection.id),
      ),
    );

  const byProviderId = new Map(
    existing
      .filter((row) => row.providerAccountId)
      .map((row) => [row.providerAccountId as string, row]),
  );

  const out = new Map<string, string>();

  for (const snapshot of snapshots) {
    const local = byProviderId.get(snapshot.providerAccountId);

    if (local) {
      if (local.syncEnabled) out.set(snapshot.providerAccountId, local.id);
      await db()
        .update(accounts)
        .set({
          ledgerBalance:
            snapshot.ledgerBalanceCents === null
              ? null
              : centsToDecimalString(snapshot.ledgerBalanceCents),
          availableBalance:
            snapshot.availableBalanceCents === null
              ? null
              : centsToDecimalString(snapshot.availableBalanceCents),
          balanceUpdatedAt: new Date(),
        })
        .where(eq(accounts.id, local.id));
      continue;
    }

    const created = await db()
      .insert(accounts)
      .values({
        userId: connection.userId,
        name: snapshot.name,
        type: snapshot.type,
        institution: connection.institutionName,
        bsbLast3: snapshot.bsbLast3,
        accountLast4: snapshot.accountLast4,
        currency: snapshot.currency,
        connectionId: connection.id,
        providerAccountId: snapshot.providerAccountId,
        ledgerBalance:
          snapshot.ledgerBalanceCents === null
            ? null
            : centsToDecimalString(snapshot.ledgerBalanceCents),
        availableBalance:
          snapshot.availableBalanceCents === null
            ? null
            : centsToDecimalString(snapshot.availableBalanceCents),
        balanceUpdatedAt: new Date(),
        // Corrected by `alignOpeningBalances` once transactions have landed.
        openingBalance: "0",
      })
      .onConflictDoNothing({
        target: [accounts.connectionId, accounts.providerAccountId],
      })
      .returning({ id: accounts.id });

    const id = created[0]?.id;
    if (id) out.set(snapshot.providerAccountId, id);
  }

  return out;
}

async function loadLedgerWindow(
  userId: string,
  accountIds: string[],
  since: string,
): Promise<LedgerRow[]> {
  if (accountIds.length === 0) return [];

  const rows = await db()
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      providerTransactionId: transactions.providerTransactionId,
      status: transactions.status,
      amount: transactions.amount,
      description: transactions.description,
      merchant: transactions.merchant,
      occurredOn: transactions.occurredOn,
      pendingSince: transactions.pendingSince,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.accountId, accountIds),
        // Pending rows are always in scope: an authorisation from before the
        // window can still settle inside it.
        sql`(${transactions.occurredOn} >= ${since} or ${transactions.status} = 'pending')`,
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    accountId: row.accountId,
    providerTransactionId: row.providerTransactionId,
    status: row.status,
    amountCents: toCents(row.amount),
    description: row.description,
    merchant: row.merchant,
    occurredOn: row.occurredOn,
    pendingSince: row.pendingSince ? row.pendingSince.toISOString() : null,
  }));
}

async function loadRules(userId: string): Promise<Rule[]> {
  const rows = await db()
    .select({
      id: categoryRules.id,
      pattern: categoryRules.pattern,
      matchType: categoryRules.matchType,
      categoryId: categoryRules.categoryId,
      renameTo: categoryRules.renameTo,
      markBusiness: categoryRules.markBusiness,
      priority: categoryRules.priority,
    })
    .from(categoryRules)
    .where(
      and(eq(categoryRules.userId, userId), eq(categoryRules.archived, false)),
    );
  return rows;
}

async function loadCategoryNames(userId: string): Promise<Map<string, string>> {
  const rows = await db()
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.archived, false)));
  return new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));
}

function buildInsert(
  connection: BankConnection,
  row: IncomingRow,
  rules: Rule[],
  categoryByName: Map<string, string>,
) {
  const outcome = applyRules(rules, row);
  const fallbackName = outcome ? null : suggestCategoryName(row);
  const categoryId =
    outcome?.categoryId ??
    (fallbackName ? categoryByName.get(fallbackName.toLowerCase()) ?? null : null);

  const now = new Date();

  return {
    userId: connection.userId,
    accountId: row.accountId,
    categoryId,
    amount: centsToDecimalString(row.amountCents),
    description: outcome?.description ?? row.description,
    merchant: row.merchant,
    occurredOn: row.occurredOn,
    isBusiness: outcome?.markBusiness ?? false,
    status: row.status,
    source: "bank" as const,
    connectionId: connection.id,
    providerTransactionId: row.providerTransactionId,
    providerPayload: row.raw ?? null,
    pendingSince: row.status === "pending" ? now : null,
    clearedAt: row.status === "posted" ? now : null,
  };
}

/**
 * Makes the ledger agree with the bank.
 *
 * Only a window of transactions is ever fetched, so a mirrored account needs
 * an opening balance that stands in for everything older. Setting it to the
 * bank's settled balance less the settled rows the ledger holds means the
 * cleared balance shown in the app is, to the cent, the balance the bank
 * reports — and stays that way as the window rolls forward.
 */
async function alignOpeningBalances(
  userId: string,
  snapshots: Awaited<ReturnType<ReturnType<typeof providerFor>["listAccounts"]>>,
  accountIdByProviderId: Map<string, string>,
): Promise<void> {
  for (const snapshot of snapshots) {
    const accountId = accountIdByProviderId.get(snapshot.providerAccountId);
    if (!accountId) continue;
    if (snapshot.ledgerBalanceCents === null) continue;

    const rows = await db()
      .select({
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, accountId),
          eq(transactions.status, "posted"),
        ),
      );

    const postedCents = toCents(rows[0]?.total ?? "0");
    await db()
      .update(accounts)
      .set({
        openingBalance: centsToDecimalString(
          snapshot.ledgerBalanceCents - postedCents,
        ),
      })
      .where(eq(accounts.id, accountId));
  }
}

/**
 * Compares what the bank says is spendable with the ledger, and warns when a
 * person is close to running out before their next pay.
 */
async function raiseBalanceAlerts(
  connection: BankConnection,
  snapshots: Awaited<ReturnType<ReturnType<typeof providerFor>["listAccounts"]>>,
  accountIdByProviderId: Map<string, string>,
  sink: NewAlert[],
): Promise<void> {
  for (const snapshot of snapshots) {
    if (!accountIdByProviderId.has(snapshot.providerAccountId)) continue;
    const available = snapshot.availableBalanceCents ?? snapshot.ledgerBalanceCents;
    if (available === null) continue;
    // Credit cards and loans sit in debit by design.
    if (snapshot.type === "credit" || snapshot.type === "loan") continue;
    if (available >= LOW_BALANCE_CENTS) continue;

    sink.push({
      kind: "low_balance",
      severity: available < 0 ? "critical" : "warning",
      title: `${snapshot.name} is down to ${formatMoney(available)}`,
      body:
        available < 0
          ? "This account is overdrawn once pending transactions are counted."
          : "Pending transactions are counted, so this is what is really left to spend.",
      href: "/app/accounts",
      amountCents: available,
      // One warning per account per day, not one per sync.
      dedupeKey: `low_balance:${snapshot.providerAccountId}:${todayIso()}`,
    });
  }
}

/** Connections due a scheduled refresh, oldest first. */
export async function connectionsDueForSync(limit = 50) {
  return db()
    .select()
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.status, "active"),
        sql`(${bankConnections.lastSyncedAt} is null or ${bankConnections.lastSyncedAt} < now() - interval '50 minutes')`,
      ),
    )
    .orderBy(sql`${bankConnections.lastSyncedAt} asc nulls first`)
    .limit(limit);
}

/** Used by the health endpoint and the bank page to explain staleness. */
export async function lastSyncFor(userId: string) {
  const rows = await db()
    .select()
    .from(bankSyncRuns)
    .where(eq(bankSyncRuns.userId, userId))
    .orderBy(sql`${bankSyncRuns.startedAt} desc`)
    .limit(1);
  return rows[0] ?? null;
}
