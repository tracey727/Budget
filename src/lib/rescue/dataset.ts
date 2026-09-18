/**
 * Loading a tenant's committed operational records for detection.
 *
 * This is the only place the database shape is translated into the shape the
 * rules see. Money crosses here once, from Postgres `numeric` strings into
 * integer cents, so no rule ever has to think about it.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  rrAppointments,
  rrInvoices,
  rrPayments,
  rrReferrals,
  rrTasks,
  rrWaitlistEntries,
} from "@/lib/db/schema";
import { toCents } from "@/lib/money";
import type { TenantDataset } from "./types";

function cents(value: string | null): number | null {
  return value === null ? null : toCents(value);
}

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export async function loadDataset(tenantId: string): Promise<TenantDataset> {
  const [appointments, invoices, payments, referrals, waitlist, tasks] = await Promise.all([
    db().select().from(rrAppointments).where(eq(rrAppointments.tenantId, tenantId)),
    db().select().from(rrInvoices).where(eq(rrInvoices.tenantId, tenantId)),
    db().select().from(rrPayments).where(eq(rrPayments.tenantId, tenantId)),
    db().select().from(rrReferrals).where(eq(rrReferrals.tenantId, tenantId)),
    db().select().from(rrWaitlistEntries).where(eq(rrWaitlistEntries.tenantId, tenantId)),
    db().select().from(rrTasks).where(eq(rrTasks.tenantId, tenantId)),
  ]);

  return {
    appointments: appointments.map((row) => ({
      id: row.id,
      externalRef: row.externalRef,
      clientRef: row.clientRef,
      workerRef: row.workerRef,
      scheduledStart: row.scheduledStart.toISOString(),
      scheduledEnd: iso(row.scheduledEnd),
      status: row.status,
      serviceValueCents: cents(row.serviceValue),
      cancellationAt: iso(row.cancellationAt),
    })),
    invoices: invoices.map((row) => ({
      id: row.id,
      externalRef: row.externalRef,
      clientRef: row.clientRef,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      totalCents: toCents(row.total),
      balanceCents: toCents(row.balance),
      status: row.status,
    })),
    payments: payments.map((row) => ({
      id: row.id,
      externalRef: row.externalRef,
      paymentDate: row.paymentDate,
      amountCents: toCents(row.amount),
      invoiceRef: row.invoiceRef,
      matchStatus: (row.matchStatus as "matched" | "unmatched" | "hold") ?? "unmatched",
    })),
    referrals: referrals.map((row) => ({
      id: row.id,
      externalRef: row.externalRef,
      receivedAt: row.receivedAt.toISOString(),
      status: row.status,
      progressedAt: iso(row.progressedAt),
    })),
    waitlist: waitlist.map((row) => ({
      id: row.id,
      externalRef: row.externalRef,
      clientRef: row.clientRef,
      status: row.status,
      availability: row.availability,
      createdAt: iso(row.createdAtSource),
    })),
    tasks: tasks.map((row) => ({
      id: row.id,
      externalRef: row.externalRef,
      taskType: row.taskType,
      dueAt: iso(row.dueAt),
      status: row.status,
      relatedValueCents: cents(row.relatedValue),
      relatedRef: row.relatedRef,
    })),
  };
}
