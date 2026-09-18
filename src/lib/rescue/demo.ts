/**
 * The synthetic demonstration workspace.
 *
 * Every record here is invented. No real person, practice or payment is
 * represented, and the workspace is flagged `is_demo` so the label follows it
 * onto every screen and export.
 *
 * The data is generated relative to today so the demo always shows the same
 * seven-step story: a cancelled slot, a completed service with no invoice, an
 * overdue invoice, a referral that stalled — then assignment, confirmed
 * recovery, and a dashboard that moves.
 */

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
import { DAY_MS, HOUR_MS } from "./time";

function at(now: Date, days: number, hourOfDay = 9): Date {
  const date = new Date(now.getTime() + days * DAY_MS);
  date.setUTCHours(hourOfDay - 10, 0, 0, 0); // ~9am Sydney, stated rather than guessed
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function seedDemoData(tenantId: string, now = new Date()): Promise<void> {
  await db()
    .insert(rrClients)
    .values(
      ["CL-D001", "CL-D002", "CL-D003", "CL-D004", "CL-D005", "CL-D006", "CL-D007"].map((ref) => ({
        tenantId,
        externalRef: ref,
        displayRef: ref,
      })),
    )
    .onConflictDoNothing();

  await db()
    .insert(rrWorkers)
    .values([
      { tenantId, externalRef: "W-D001", displayName: "Practitioner A" },
      { tenantId, externalRef: "W-D002", displayName: "Practitioner B" },
    ])
    .onConflictDoNothing();

  const cancelledStart = at(now, -3, 9);
  const noShowStart = at(now, -6, 13);
  const completedInvoiced = at(now, -10, 10);
  const completedUnbilled = at(now, -12, 11);

  await db()
    .insert(rrAppointments)
    .values([
      {
        tenantId,
        externalRef: "APT-D001",
        clientRef: "CL-D001",
        workerRef: "W-D001",
        scheduledStart: cancelledStart,
        scheduledEnd: new Date(cancelledStart.getTime() + HOUR_MS),
        status: "cancelled",
        serviceValue: "252.99",
        cancellationAt: new Date(cancelledStart.getTime() - 12 * HOUR_MS),
      },
      {
        tenantId,
        externalRef: "APT-D002",
        clientRef: "CL-D002",
        workerRef: "W-D001",
        scheduledStart: completedInvoiced,
        scheduledEnd: new Date(completedInvoiced.getTime() + HOUR_MS),
        status: "completed",
        serviceValue: "252.99",
        cancellationAt: null,
      },
      {
        tenantId,
        externalRef: "APT-D003",
        clientRef: "CL-D003",
        workerRef: "W-D002",
        scheduledStart: noShowStart,
        scheduledEnd: new Date(noShowStart.getTime() + HOUR_MS),
        status: "no_show",
        serviceValue: "252.99",
        cancellationAt: null,
      },
      {
        tenantId,
        externalRef: "APT-D004",
        clientRef: "CL-D005",
        workerRef: "W-D002",
        scheduledStart: completedUnbilled,
        scheduledEnd: new Date(completedUnbilled.getTime() + HOUR_MS),
        status: "completed",
        serviceValue: "189.00",
        cancellationAt: null,
      },
      {
        tenantId,
        externalRef: "APT-D005",
        clientRef: "CL-D004",
        workerRef: "W-D001",
        scheduledStart: at(now, 7, 9),
        scheduledEnd: new Date(at(now, 7, 9).getTime() + HOUR_MS),
        status: "booked",
        serviceValue: "252.99",
        cancellationAt: null,
      },
    ])
    .onConflictDoNothing();

  const duplicateIssue = isoDate(at(now, -6));

  await db()
    .insert(rrInvoices)
    .values([
      {
        tenantId,
        externalRef: "INV-D001",
        clientRef: "CL-D002",
        issueDate: isoDate(at(now, -10)),
        dueDate: isoDate(at(now, -3)),
        total: "252.99",
        balance: "252.99",
        status: "overdue",
      },
      {
        tenantId,
        externalRef: "INV-D002",
        clientRef: "CL-D004",
        issueDate: isoDate(at(now, -25)),
        dueDate: isoDate(at(now, -18)),
        total: "1240.00",
        balance: "1240.00",
        status: "overdue",
      },
      {
        tenantId,
        externalRef: "INV-D003",
        clientRef: "CL-D006",
        issueDate: duplicateIssue,
        dueDate: isoDate(at(now, 1)),
        total: "379.49",
        balance: "0.00",
        status: "paid",
      },
      {
        tenantId,
        externalRef: "INV-D004",
        clientRef: "CL-D006",
        issueDate: duplicateIssue,
        dueDate: isoDate(at(now, 1)),
        total: "379.49",
        balance: "379.49",
        status: "open",
      },
      {
        tenantId,
        externalRef: "INV-D005",
        clientRef: "CL-D007",
        issueDate: isoDate(at(now, -20)),
        dueDate: isoDate(at(now, -13)),
        total: "420.00",
        balance: "0.00",
        status: "overdue",
      },
    ])
    .onConflictDoNothing();

  await db()
    .insert(rrPayments)
    .values([
      {
        tenantId,
        externalRef: "PAY-D001",
        paymentDate: isoDate(at(now, -4)),
        amount: "379.49",
        invoiceRef: "INV-D003",
        matchStatus: "unmatched", // resolved by the next detection run
        dedupeKey: "PAY-D001",
      },
      {
        tenantId,
        externalRef: "PAY-D002",
        paymentDate: isoDate(at(now, -2)),
        amount: "252.99",
        invoiceRef: null,
        matchStatus: "unmatched",
        dedupeKey: "PAY-D002",
      },
    ])
    .onConflictDoNothing();

  await db()
    .insert(rrReferrals)
    .values([
      {
        tenantId,
        externalRef: "REF-D001",
        receivedAt: at(now, -21),
        status: "received",
        progressedAt: null,
        dedupeKey: "REF-D001",
      },
      {
        tenantId,
        externalRef: "REF-D002",
        receivedAt: at(now, -10),
        status: "booked",
        progressedAt: at(now, -9),
        dedupeKey: "REF-D002",
      },
    ])
    .onConflictDoNothing();

  await db()
    .insert(rrWaitlistEntries)
    .values([
      {
        tenantId,
        externalRef: "WL-D001",
        clientRef: "CL-D003",
        status: "open",
        availability: "Weekday mornings",
        createdAtSource: at(now, -30),
        dedupeKey: "WL-D001",
      },
      {
        tenantId,
        externalRef: "WL-D002",
        clientRef: "CL-D007",
        status: "closed",
        availability: "Any",
        createdAtSource: at(now, -40),
        dedupeKey: "WL-D002",
      },
    ])
    .onConflictDoNothing();

  await db()
    .insert(rrTasks)
    .values([
      {
        tenantId,
        externalRef: "TASK-D001",
        taskType: "invoice_followup",
        dueAt: at(now, -5, 17),
        status: "open",
        relatedValue: "1240.00",
        relatedRef: "INV-D002",
        dedupeKey: "TASK-D001",
      },
      {
        tenantId,
        externalRef: "TASK-D002",
        taskType: "referral_followup",
        dueAt: at(now, -2, 17),
        status: "open",
        relatedValue: null,
        relatedRef: "REF-D001",
        dedupeKey: "TASK-D002",
      },
      {
        tenantId,
        externalRef: "TASK-D003",
        taskType: "rebooking",
        dueAt: at(now, 1, 17),
        status: "open",
        relatedValue: null,
        relatedRef: "APT-D001",
        dedupeKey: "TASK-D003",
      },
    ])
    .onConflictDoNothing();
}
