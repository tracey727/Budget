/**
 * Working out what changed at the bank since last time.
 *
 * This is deliberately free of database and network access: it takes the rows
 * already in the ledger plus the window the bank just returned, and produces a
 * plan. That makes the hard part — deciding that a $64.30 fuel authorisation
 * and a $91.15 fuel settlement two days later are the same purchase — testable
 * without a bank or a database.
 *
 * The four outcomes are:
 *
 *   insert  a transaction the ledger has never seen
 *   update  a field the bank revised (amount, description, date)
 *   clear   a pending authorisation the bank has now settled
 *   drop    an authorisation the bank abandoned without settling
 */

import type { BankTransactionSnapshot, ClearingStatus } from "./types";

export type LedgerRow = {
  id: string;
  accountId: string;
  providerTransactionId: string | null;
  status: string;
  amountCents: number;
  description: string;
  merchant: string | null;
  occurredOn: string;
  /** ISO timestamp of when the row was first seen pending, if it ever was. */
  pendingSince: string | null;
};

/** An incoming snapshot after its provider account has been resolved locally. */
export type IncomingRow = BankTransactionSnapshot & { accountId: string };

export type ReconcilePlan = {
  inserts: IncomingRow[];
  updates: Array<{
    id: string;
    incoming: IncomingRow;
    /** Which fields actually differ — used for the audit trail and alerts. */
    changed: string[];
  }>;
  clears: Array<{
    id: string;
    incoming: IncomingRow;
    /** What the ledger held while it was pending, in cents. */
    previousAmountCents: number;
    /** Set when settlement arrived under a brand new provider id. */
    replacedProviderTransactionId: string | null;
  }>;
  drops: Array<{ id: string; description: string; amountCents: number }>;
};

/**
 * How long an authorisation may be missing from the bank's window before it is
 * treated as abandoned. Banks routinely drop a hotel or fuel hold without ever
 * settling it, but they also lag, so nothing is written off on the first miss.
 */
export const DROP_AFTER_HOURS = 72;

/** A settlement may land this many days after the authorisation. */
const MATCH_WINDOW_DAYS = 8;
/** When the amount also moved, the settlement has to arrive sooner than that. */
const DRIFT_WINDOW_DAYS = 5;

/**
 * Tolerance on the settled amount.
 *
 * How far the figure may move depends on how well the text agrees. A fuel
 * pre-authorisation settles well above the hold, and a restaurant adds a tip,
 * but both name the same merchant — so a confident name match buys a wide
 * tolerance. Without one, only an exact amount is accepted, because "$50-ish
 * at some shop, some time last week" describes half a statement.
 */
const MATCH_ABSOLUTE_CENTS = 1_000;
const MATCH_RELATIVE_NAMED = 0.6;
const MATCH_RELATIVE_UNNAMED = 0.05;

const NOISE = new Set([
  "pty", "ltd", "the", "and", "aus", "au", "australia", "pos", "eftpos",
  "purchase", "card", "visa", "mastercard", "value", "date", "ref", "tfr",
  "payment", "sq", "pending",
]);

/** Reduces bank text to comparable tokens: "SQ *COFFEE 12" → ["coffee"]. */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !NOISE.has(token) && !/^\d+$/.test(token));
}

function daysApart(a: string, b: string): number {
  return Math.abs(
    Math.round(
      (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000,
    ),
  );
}

/** How strongly the two rows agree on who was paid. */
function textAgreement(pending: LedgerRow, settled: IncomingRow) {
  const pendingMerchant = (pending.merchant ?? "").trim().toLowerCase();
  const settledMerchant = (settled.merchant ?? "").trim().toLowerCase();
  const sameMerchant = Boolean(pendingMerchant) && pendingMerchant === settledMerchant;

  const pendingTokens = new Set([
    ...tokenise(pending.description),
    ...tokenise(pending.merchant ?? ""),
  ]);
  const shared = [
    ...tokenise(settled.description),
    ...tokenise(settled.merchant ?? ""),
  ].filter((token) => pendingTokens.has(token)).length;

  return { sameMerchant, shared, named: sameMerchant || shared > 0 };
}

/**
 * Confidence that `settled` is the settlement of `pending`, 0 when it cannot
 * be. Higher is better; the caller takes the best scoring candidate.
 */
export function settlementScore(pending: LedgerRow, settled: IncomingRow): number {
  if (pending.accountId !== settled.accountId) return 0;
  // A refund never settles a purchase, so the direction has to agree.
  if (Math.sign(pending.amountCents) !== Math.sign(settled.amountCents)) return 0;

  const gap = daysApart(pending.occurredOn, settled.occurredOn);
  if (gap > MATCH_WINDOW_DAYS) return 0;

  const agreement = textAgreement(pending, settled);
  const exactAmount = pending.amountCents === settled.amountCents;

  // Without a name in common, an exact amount within a day is the only thing
  // trustworthy enough to fold two rows into one.
  if (!agreement.named && !(exactAmount && gap <= 1)) return 0;

  const drift = Math.abs(
    Math.abs(settled.amountCents) - Math.abs(pending.amountCents),
  );
  const relative = agreement.named ? MATCH_RELATIVE_NAMED : MATCH_RELATIVE_UNNAMED;
  const tolerance = Math.max(
    MATCH_ABSOLUTE_CENTS,
    Math.abs(pending.amountCents) * relative,
  );
  if (drift > tolerance) return 0;
  // A figure that moved needs the settlement to have arrived promptly.
  if (!exactAmount && gap > DRIFT_WINDOW_DAYS) return 0;

  let score = 0;

  // An exact amount on the same day is as close to certain as this gets.
  if (exactAmount) score += 50;
  else score += Math.round(30 * (1 - Math.min(1, drift / tolerance)));

  score += Math.max(0, 20 - gap * 3);
  if (agreement.sameMerchant) score += 30;
  score += Math.min(30, agreement.shared * 15);

  return score;
}

/** Below this, a settlement is treated as a separate transaction. */
export const MIN_SETTLEMENT_SCORE = 45;

function normaliseStatus(status: ClearingStatus): string {
  return status;
}

export function reconcile(input: {
  existing: LedgerRow[];
  incoming: IncomingRow[];
  /** Milliseconds; injected so tests are not clock-dependent. */
  now: number;
}): ReconcilePlan {
  const { existing, incoming, now } = input;

  const plan: ReconcilePlan = { inserts: [], updates: [], clears: [], drops: [] };

  const byProviderId = new Map<string, LedgerRow>();
  for (const row of existing) {
    if (row.providerTransactionId) byProviderId.set(row.providerTransactionId, row);
  }

  /** Pending rows still looking for their settlement. */
  const openPending = existing.filter((row) => row.status === "pending");
  const claimed = new Set<string>();
  /** Provider ids the bank still knows about, used to spot abandoned holds. */
  const seen = new Set<string>();

  const unmatched: IncomingRow[] = [];

  for (const row of incoming) {
    seen.add(row.providerTransactionId);
    const match = byProviderId.get(row.providerTransactionId);

    if (!match) {
      unmatched.push(row);
      continue;
    }

    // The same id came back. Either it settled, or a field was revised.
    if (match.status === "pending" && row.status === "posted") {
      claimed.add(match.id);
      plan.clears.push({
        id: match.id,
        incoming: row,
        previousAmountCents: match.amountCents,
        replacedProviderTransactionId: null,
      });
      continue;
    }

    if (match.status === "pending" && row.status === "declined") {
      claimed.add(match.id);
      plan.drops.push({
        id: match.id,
        description: match.description,
        amountCents: match.amountCents,
      });
      continue;
    }

    const changed: string[] = [];
    if (match.amountCents !== row.amountCents) changed.push("amount");
    if (match.description !== row.description) changed.push("description");
    if (match.occurredOn !== row.occurredOn) changed.push("date");
    if (match.status !== normaliseStatus(row.status)) changed.push("status");
    if (changed.length > 0) {
      claimed.add(match.id);
      plan.updates.push({ id: match.id, incoming: row, changed });
    } else {
      claimed.add(match.id);
    }
  }

  // Settlements that arrived under a new id have to be matched by shape.
  // Best-scoring pairs are taken first so a strong match is never stolen by a
  // weaker one competing for the same authorisation.
  const candidates: Array<{ score: number; pending: LedgerRow; row: IncomingRow }> = [];

  for (const row of unmatched) {
    if (row.status !== "posted") continue;
    for (const pending of openPending) {
      if (claimed.has(pending.id)) continue;
      const score = settlementScore(pending, row);
      if (score >= MIN_SETTLEMENT_SCORE) candidates.push({ score, pending, row });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const usedRows = new Set<string>();

  for (const candidate of candidates) {
    if (claimed.has(candidate.pending.id)) continue;
    if (usedRows.has(candidate.row.providerTransactionId)) continue;
    claimed.add(candidate.pending.id);
    usedRows.add(candidate.row.providerTransactionId);
    plan.clears.push({
      id: candidate.pending.id,
      incoming: candidate.row,
      previousAmountCents: candidate.pending.amountCents,
      replacedProviderTransactionId: candidate.pending.providerTransactionId,
    });
  }

  for (const row of unmatched) {
    if (usedRows.has(row.providerTransactionId)) continue;
    if (row.status === "declined") continue;
    plan.inserts.push(row);
  }

  // Anything still pending that the bank has stopped reporting, and that has
  // had long enough to settle, was abandoned by the bank.
  for (const pending of openPending) {
    if (claimed.has(pending.id)) continue;
    if (pending.providerTransactionId && seen.has(pending.providerTransactionId)) continue;
    const since = pending.pendingSince ? Date.parse(pending.pendingSince) : null;
    if (since === null || Number.isNaN(since)) continue;
    if (now - since < DROP_AFTER_HOURS * 3_600_000) continue;
    plan.drops.push({
      id: pending.id,
      description: pending.description,
      amountCents: pending.amountCents,
    });
  }

  return plan;
}
