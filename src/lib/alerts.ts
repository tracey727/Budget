/**
 * Automated findings — the app telling a person something rather than waiting
 * to be asked.
 *
 * Alerts are raised by the bank sync (a payment cleared, a hold was dropped,
 * a balance fell below the buffer), by budget checks, and by bill reminders.
 * Every alert carries a `dedupeKey`, which is unique per person, so a sync
 * that runs hourly cannot raise the same finding hourly.
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { centsToDecimalString } from "@/lib/money";

export type AlertKind =
  | "transaction_cleared"
  | "transaction_pending"
  | "transaction_dropped"
  | "low_balance"
  | "budget_warning"
  | "budget_exceeded"
  | "bill_due"
  | "large_transaction"
  | "connection_action"
  | "sync_failed"
  | "goal_reached";

export type AlertSeverity = "info" | "warning" | "critical";

export type NewAlert = {
  kind: AlertKind;
  severity?: AlertSeverity;
  title: string;
  body: string;
  href?: string;
  amountCents?: number | null;
  /** Must identify the finding, not the moment — that is what makes it idempotent. */
  dedupeKey: string;
};

/** Writes alerts, silently ignoring ones already raised. Returns how many were new. */
export async function raiseAlerts(
  userId: string,
  items: NewAlert[],
): Promise<number> {
  if (items.length === 0) return 0;

  // De-duplicate within the batch first; the unique index would reject the
  // second copy and take the rest of the insert down with it.
  const unique = new Map<string, NewAlert>();
  for (const item of items) unique.set(item.dedupeKey, item);

  const inserted = await db()
    .insert(alerts)
    .values(
      [...unique.values()].map((item) => ({
        userId,
        kind: item.kind,
        severity: item.severity ?? "info",
        title: item.title.slice(0, 200),
        body: item.body.slice(0, 500),
        href: item.href ?? null,
        amount:
          item.amountCents === undefined || item.amountCents === null
            ? null
            : centsToDecimalString(item.amountCents),
        dedupeKey: item.dedupeKey.slice(0, 200),
      })),
    )
    .onConflictDoNothing({ target: [alerts.userId, alerts.dedupeKey] })
    .returning({ id: alerts.id });

  return inserted.length;
}

export async function listAlerts(userId: string, limit = 30) {
  return db()
    .select()
    .from(alerts)
    .where(eq(alerts.userId, userId))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);
}

export async function unreadAlertCount(userId: string): Promise<number> {
  const rows = await db()
    .select({ count: sql<string>`count(*)` })
    .from(alerts)
    .where(and(eq(alerts.userId, userId), isNull(alerts.readAt)));
  return Number(rows[0]?.count ?? 0);
}

export async function markAlertsRead(userId: string, id?: string): Promise<void> {
  await db()
    .update(alerts)
    .set({ readAt: new Date() })
    .where(
      id
        ? and(eq(alerts.userId, userId), eq(alerts.id, id))
        : and(eq(alerts.userId, userId), isNull(alerts.readAt)),
    );
}
