/**
 * Committing validated rows into canonical records.
 *
 * Only VALID rows are committed. INVALID and HOLD rows stay on the import job
 * with their reasons attached, so nothing is quietly dropped and the counts on
 * screen always add up to the file that was uploaded.
 *
 * Commits are idempotent. Re-importing the same export updates the same
 * records rather than duplicating them, because every canonical table has a
 * tenant-scoped natural key — the customer's own reference where they supply
 * one, and a deterministic key derived from the row where they do not.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  rrAppointments,
  rrClients,
  rrInvoices,
  rrPayments,
  rrReferrals,
  rrTasks,
  rrWaitlistEntries,
  rrWorkers,
} from "@/lib/db/schema";
import { centsToDecimalString } from "@/lib/money";
import type { SourceType } from "./types";

export type CommittedRow = Record<string, string | number | null>;

const text = (row: CommittedRow, key: string): string | null => {
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

const amount = (row: CommittedRow, key: string): string | null => {
  const value = row[key];
  return typeof value === "number" ? centsToDecimalString(value) : null;
};

const instant = (row: CommittedRow, key: string): Date | null => {
  const value = row[key];
  if (typeof value !== "string" || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * A stable key for sources whose reference column is optional.
 *
 * It is built from the fields that identify the event in the real world, so the
 * same row imported twice lands on the same record — which is what stops a
 * re-upload inflating the numbers.
 */
function derivedKey(parts: (string | number | null)[]): string {
  return parts.map((part) => (part === null ? "" : String(part))).join("|");
}

export type CommitResult = {
  committed: number;
  clientsSeen: number;
  workersSeen: number;
};

export async function commitRows(
  tenantId: string,
  importJobId: string,
  sourceType: SourceType,
  rows: CommittedRow[],
): Promise<CommitResult> {
  if (rows.length === 0) return { committed: 0, clientsSeen: 0, workersSeen: 0 };

  const clientRefs = new Set<string>();
  const workerRefs = new Set<string>();
  const now = new Date();

  for (const row of rows) {
    const client = text(row, "client_ref");
    if (client) clientRefs.add(client);
    const worker = text(row, "worker_ref");
    if (worker) workerRefs.add(worker);
  }

  if (clientRefs.size > 0) {
    await db()
      .insert(rrClients)
      .values([...clientRefs].map((ref) => ({ tenantId, externalRef: ref, displayRef: ref })))
      .onConflictDoNothing({ target: [rrClients.tenantId, rrClients.externalRef] });
  }
  if (workerRefs.size > 0) {
    await db()
      .insert(rrWorkers)
      .values([...workerRefs].map((ref) => ({ tenantId, externalRef: ref, displayName: ref })))
      .onConflictDoNothing({ target: [rrWorkers.tenantId, rrWorkers.externalRef] });
  }

  switch (sourceType) {
    case "appointments": {
      for (const row of rows) {
        const externalRef = text(row, "appointment_ref");
        const start = instant(row, "scheduled_start");
        if (!externalRef || !start) continue;

        const values = {
          tenantId,
          externalRef,
          clientRef: text(row, "client_ref"),
          workerRef: text(row, "worker_ref"),
          scheduledStart: start,
          scheduledEnd: instant(row, "scheduled_end"),
          status: text(row, "status") ?? "unknown",
          serviceValue: amount(row, "service_value"),
          cancellationAt: instant(row, "cancellation_at"),
          sourceImportJobId: importJobId,
          updatedAt: now,
        };

        await db()
          .insert(rrAppointments)
          .values(values)
          .onConflictDoUpdate({
            target: [rrAppointments.tenantId, rrAppointments.externalRef],
            set: values,
          });
      }
      break;
    }

    case "invoices": {
      for (const row of rows) {
        const externalRef = text(row, "invoice_ref");
        const issueDate = text(row, "issue_date");
        const total = amount(row, "total");
        const balance = amount(row, "balance");
        if (!externalRef || !issueDate || total === null || balance === null) continue;

        const values = {
          tenantId,
          externalRef,
          clientRef: text(row, "client_ref"),
          issueDate,
          dueDate: text(row, "due_date"),
          total,
          balance,
          status: text(row, "status") ?? "unknown",
          sourceImportJobId: importJobId,
          updatedAt: now,
        };

        await db()
          .insert(rrInvoices)
          .values(values)
          .onConflictDoUpdate({ target: [rrInvoices.tenantId, rrInvoices.externalRef], set: values });
      }
      break;
    }

    case "payments": {
      for (const row of rows) {
        const paymentDate = text(row, "payment_date");
        const value = amount(row, "amount");
        if (!paymentDate || value === null) continue;

        const externalRef = text(row, "payment_ref");
        const invoiceRef = text(row, "invoice_ref");
        const dedupeKey = externalRef ?? derivedKey([paymentDate, value, invoiceRef]);

        // Deterministic matching happens here, at commit time, so the rules
        // never have to guess what "matched" means.
        let invoiceId: string | null = null;
        if (invoiceRef) {
          const found = await db()
            .select({ id: rrInvoices.id })
            .from(rrInvoices)
            .where(and(eq(rrInvoices.tenantId, tenantId), eq(rrInvoices.externalRef, invoiceRef)))
            .limit(1);
          invoiceId = found[0]?.id ?? null;
        }

        const values = {
          tenantId,
          externalRef,
          paymentDate,
          amount: value,
          invoiceRef,
          invoiceId,
          matchStatus: invoiceId ? "matched" : invoiceRef ? "hold" : "unmatched",
          dedupeKey,
          sourceImportJobId: importJobId,
          updatedAt: now,
        };

        await db()
          .insert(rrPayments)
          .values(values)
          .onConflictDoUpdate({ target: [rrPayments.tenantId, rrPayments.dedupeKey], set: values });
      }
      break;
    }

    case "referrals": {
      for (const row of rows) {
        const receivedAt = instant(row, "received_at");
        if (!receivedAt) continue;

        const externalRef = text(row, "referral_ref");
        const values = {
          tenantId,
          externalRef,
          receivedAt,
          status: text(row, "status") ?? "unknown",
          progressedAt: instant(row, "progressed_at"),
          dedupeKey: externalRef ?? derivedKey([receivedAt.toISOString(), text(row, "status")]),
          sourceImportJobId: importJobId,
          updatedAt: now,
        };

        await db()
          .insert(rrReferrals)
          .values(values)
          .onConflictDoUpdate({ target: [rrReferrals.tenantId, rrReferrals.dedupeKey], set: values });
      }
      break;
    }

    case "waitlist": {
      for (const row of rows) {
        const status = text(row, "status");
        if (!status) continue;

        const externalRef = text(row, "waitlist_ref");
        const values = {
          tenantId,
          externalRef,
          clientRef: text(row, "client_ref"),
          status,
          availability: text(row, "availability"),
          createdAtSource: instant(row, "created_at"),
          dedupeKey: externalRef ?? derivedKey([text(row, "client_ref"), status]),
          sourceImportJobId: importJobId,
          updatedAt: now,
        };

        await db()
          .insert(rrWaitlistEntries)
          .values(values)
          .onConflictDoUpdate({
            target: [rrWaitlistEntries.tenantId, rrWaitlistEntries.dedupeKey],
            set: values,
          });
      }
      break;
    }

    case "tasks": {
      for (const row of rows) {
        const taskType = text(row, "task_type");
        const status = text(row, "status");
        if (!taskType || !status) continue;

        const externalRef = text(row, "task_ref");
        const due = instant(row, "due_at");
        const values = {
          tenantId,
          externalRef,
          taskType,
          dueAt: due,
          status,
          relatedValue: amount(row, "related_value"),
          relatedRef: text(row, "related_ref"),
          dedupeKey: externalRef ?? derivedKey([taskType, due?.toISOString() ?? null, text(row, "related_ref")]),
          sourceImportJobId: importJobId,
          updatedAt: now,
        };

        await db()
          .insert(rrTasks)
          .values(values)
          .onConflictDoUpdate({ target: [rrTasks.tenantId, rrTasks.dedupeKey], set: values });
      }
      break;
    }
  }

  return { committed: rows.length, clientsSeen: clientRefs.size, workersSeen: workerRefs.size };
}
