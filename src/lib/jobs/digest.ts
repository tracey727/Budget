/**
 * Emailing what the app noticed.
 *
 * Alerts are raised as things happen, but a person who is not in the app will
 * not see them, and the whole point of a cleared-payment alert is that it
 * reaches you. The digest sweeps alerts that have not been emailed and sends
 * one message per person rather than one per finding.
 *
 * Two guards keep it civil: nothing is sent to an unverified address, and
 * `emailedAt` is stamped whether or not the send succeeded, so a provider
 * outage cannot turn into a backlog that arrives all at once.
 */

import { and, desc, eq, isNull, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, users } from "@/lib/db/schema";
import { accountBalances, totalBalances } from "@/lib/data/queries";
import { sendEmail, emailConfigured } from "@/lib/email/send";
import { alertDigestEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";

/** Never email more than this many findings at once; the rest wait. */
const MAX_ITEMS_PER_EMAIL = 10;
/** Alerts quieter than this are left for the person to find in the app. */
const EMAIL_SEVERITIES = ["warning", "critical"];
/** These are worth an email even at "info", because money actually moved. */
const EMAIL_KINDS = ["transaction_cleared", "transaction_dropped", "bill_due"];

export type DigestSummary = { recipients: number; sent: number; skipped: number };

export async function sendAlertDigests(limit = 100): Promise<DigestSummary> {
  const summary: DigestSummary = { recipients: 0, sent: 0, skipped: 0 };

  if (!emailConfigured()) return summary;

  const pending = await db()
    .select({
      userId: alerts.userId,
      count: sql<string>`count(*)`,
    })
    .from(alerts)
    .where(
      and(
        isNull(alerts.emailedAt),
        or(
          inArray(alerts.severity, EMAIL_SEVERITIES),
          inArray(alerts.kind, EMAIL_KINDS),
        ),
      ),
    )
    .groupBy(alerts.userId)
    .limit(limit);

  for (const row of pending) {
    summary.recipients += 1;

    const person = await db()
      .select({
        email: users.email,
        fullName: users.fullName,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);

    const recipient = person[0];

    const items = await db()
      .select()
      .from(alerts)
      .where(and(eq(alerts.userId, row.userId), isNull(alerts.emailedAt)))
      .orderBy(desc(alerts.createdAt))
      .limit(MAX_ITEMS_PER_EMAIL);

    if (items.length === 0) continue;

    // Stamp first: a send that fails is not worth re-sending to everyone on
    // the next run, and the alerts are all still visible in the app.
    await db()
      .update(alerts)
      .set({ emailedAt: new Date() })
      .where(
        inArray(
          alerts.id,
          items.map((item) => item.id),
        ),
      );

    if (!recipient?.emailVerifiedAt) {
      summary.skipped += 1;
      continue;
    }

    const balances = await accountBalances(row.userId);
    const totals = totalBalances(balances);

    const message = alertDigestEmail({
      name: recipient.fullName,
      appUrl: appUrl(),
      items: items.map((item) => ({
        title: item.title,
        body: item.body,
        severity: item.severity,
      })),
      availableCents: totals.availableCents,
      pendingCents: totals.pendingCents,
    });

    const result = await sendEmail({
      to: recipient.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (result.ok) summary.sent += 1;
    else summary.skipped += 1;
  }

  return summary;
}
