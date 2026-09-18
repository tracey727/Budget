/**
 * Shared vocabulary for the rule pack.
 *
 * Practice systems all spell the same idea differently — "DNA", "no_show",
 * "Did Not Attend" — so status handling is centralised. Anything genuinely
 * unrecognised falls through to "not eligible" rather than being assumed, which
 * keeps an unknown status out of the findings instead of inventing one.
 */

import { formatMoney } from "@/lib/money";
import { HOUR_MS } from "../time";
import type { Appointment, EvidenceRef, Invoice, OperationalTask, TenantDataset } from "../types";

export function norm(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim().replace(/[\s\-]+/g, "_");
}

export const isCancelled = (status: string) => norm(status).includes("cancel");
export const isLateCancelled = (status: string) =>
  norm(status).includes("cancel") && norm(status).includes("late");
export const isNoShow = (status: string) => {
  const s = norm(status);
  return s.includes("no_show") || s === "dna" || s.includes("did_not_attend") || s.includes("noshow");
};
export const isCompletedAppointment = (status: string) => {
  const s = norm(status);
  return s.includes("complete") || s === "attended" || s === "finished" || s === "seen";
};
export const isActiveBooking = (status: string) => {
  const s = norm(status);
  if (isCancelled(s) || isNoShow(s)) return false;
  return (
    s.includes("book") ||
    s.includes("confirm") ||
    s.includes("schedul") ||
    s.includes("arriv") ||
    isCompletedAppointment(s)
  );
};

export const isVoidLikeInvoice = (status: string) => {
  const s = norm(status);
  return s.includes("void") || s.includes("credit") || s.includes("cancel") || s.includes("reissue") || s.includes("adjust");
};
export const isPaidInvoice = (status: string) => norm(status).includes("paid");

export const isResolvedTask = (status: string) => {
  const s = norm(status);
  return s.includes("complete") || s.includes("done") || s.includes("resolved") || s.includes("closed") || s.includes("cancel");
};

export const isProgressedReferral = (status: string) => {
  const s = norm(status);
  return (
    s.includes("book") ||
    s.includes("accept") ||
    s.includes("declin") ||
    s.includes("reject") ||
    s.includes("closed") ||
    s.includes("complete") ||
    s.includes("triag")
  );
};

export const isOpenWaitlist = (status: string) => {
  const s = norm(status);
  return s === "open" || s.includes("wait") || s === "active" || s === "";
};

/** Today in the tenant's timezone, as YYYY-MM-DD. */
export function todayInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Midday UTC on a date — used only for ageing, never for display. */
export function dateToInstant(date: string): string {
  return `${date}T12:00:00.000Z`;
}

export function money(cents: number | null): string {
  return cents === null ? "no value supplied" : formatMoney(cents);
}

/** The window a cancelled appointment released, defaulting to one hour. */
export function slotWindow(appointment: Appointment): { start: number; end: number } {
  const start = new Date(appointment.scheduledStart).getTime();
  const end = appointment.scheduledEnd ? new Date(appointment.scheduledEnd).getTime() : start + HOUR_MS;
  return { start, end: end > start ? end : start + HOUR_MS };
}

/**
 * Was a released slot taken by another booking?
 *
 * When the export names the practitioner, only that practitioner's diary is
 * searched — a different clinician being busy at the same time says nothing
 * about whether this slot was refilled.
 */
export function replacementBooking(
  appointment: Appointment,
  all: Appointment[],
): Appointment | null {
  const window = slotWindow(appointment);
  return (
    all.find((other) => {
      if (other.externalRef === appointment.externalRef) return false;
      if (!isActiveBooking(other.status)) return false;
      if (appointment.workerRef && other.workerRef && other.workerRef !== appointment.workerRef) return false;
      if (appointment.workerRef && !other.workerRef) return false;
      const otherWindow = slotWindow(other);
      return otherWindow.start < window.end && otherWindow.end > window.start;
    }) ?? null
  );
}

/** Tasks that name this reference, in either the related or the task reference. */
export function tasksFor(reference: string, tasks: OperationalTask[]): OperationalTask[] {
  const target = norm(reference);
  if (target === "") return [];
  return tasks.filter((task) => {
    const related = norm(task.relatedRef);
    const own = norm(task.externalRef);
    return related === target || (own !== "" && own.includes(target));
  });
}

export function invoiceByRef(reference: string | null, invoices: Invoice[]): Invoice | null {
  if (!reference) return null;
  const target = norm(reference);
  return invoices.find((invoice) => norm(invoice.externalRef) === target) ?? null;
}

export function appointmentEvidence(appointment: Appointment): EvidenceRef {
  return {
    entityType: "appointment",
    entityId: appointment.id,
    label: `Appointment ${appointment.externalRef}`,
    detail: {
      reference: appointment.externalRef,
      status: appointment.status,
      scheduled_start: appointment.scheduledStart,
      scheduled_end: appointment.scheduledEnd,
      practitioner: appointment.workerRef,
      client: appointment.clientRef,
      service_value: appointment.serviceValueCents,
      cancelled_at: appointment.cancellationAt,
    },
  };
}

export function invoiceEvidence(invoice: Invoice): EvidenceRef {
  return {
    entityType: "invoice",
    entityId: invoice.id,
    label: `Invoice ${invoice.externalRef}`,
    detail: {
      reference: invoice.externalRef,
      client: invoice.clientRef,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      total: invoice.totalCents,
      balance: invoice.balanceCents,
      status: invoice.status,
    },
  };
}

export function taskEvidence(task: OperationalTask): EvidenceRef {
  return {
    entityType: "task",
    entityId: task.id,
    label: `Task ${task.externalRef ?? task.taskType}`,
    detail: {
      reference: task.externalRef,
      type: task.taskType,
      due_at: task.dueAt,
      status: task.status,
      related_ref: task.relatedRef,
      related_value: task.relatedValueCents,
    },
  };
}

/** Sorting that keeps rule output stable between runs regardless of input order. */
export function byKey<T extends { findingKey: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.findingKey.localeCompare(b.findingKey));
}

export function datasetCounts(data: TenantDataset): Record<string, number> {
  return {
    appointments: data.appointments.length,
    invoices: data.invoices.length,
    payments: data.payments.length,
    referrals: data.referrals.length,
    waitlist: data.waitlist.length,
    tasks: data.tasks.length,
  };
}
