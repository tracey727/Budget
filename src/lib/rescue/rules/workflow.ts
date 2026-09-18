/**
 * Workflow and data-integrity rules: RR-AH-006, 008 and 010.
 *
 * RR-AH-010 is deliberately different from the others: it never claims a
 * dollar and never claims a leak. It exists because a contradictory record is
 * worse than a missing one — it makes every other rule unreliable — so it is
 * surfaced as HOLD for correction at source rather than quietly worked around.
 */

import { DAY_MS, daysBetween } from "../time";
import type { RuleContext, RuleDefinition, RuleOutput } from "../types";
import {
  byKey,
  dateToInstant,
  invoiceByRef,
  invoiceEvidence,
  isPaidInvoice,
  isProgressedReferral,
  isResolvedTask,
  isVoidLikeInvoice,
  money,
  norm,
  appointmentEvidence,
  taskEvidence,
} from "./helpers";

/* -------------------------------------------------------------------------- */

export const referralNotProgressed: RuleDefinition = {
  id: "RR-AH-006",
  name: "Referral not progressed",
  domain: "allied_health",
  version: 1,
  logicHash: "1a2b3c4d5e6f7081",
  description:
    "A referral has been sitting without a booking, acceptance, decline or closure beyond the agreed threshold.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const threshold = ctx.settings.referralProgressDays;

    for (const referral of ctx.data.referrals) {
      if (referral.progressedAt) continue;
      if (isProgressedReferral(referral.status)) continue;

      const age = daysBetween(referral.receivedAt, ctx.now);
      if (age < threshold) continue;

      const reference = referral.externalRef ?? referral.receivedAt;

      out.push({
        findingKey: `RR-AH-006.v1:referral:${reference}`,
        title: `Referral ${reference} has sat for ${Math.floor(age)} days`,
        explanation:
          `This referral was received on ${referral.receivedAt.slice(0, 10)} with status "${referral.status}" and has no recorded outcome — ` +
          `not booked, not accepted, not declined, not closed — after ${threshold} days. A referral that goes cold is a client the practice never sees.`,
        calculation:
          "No dollar value is shown. Future revenue from a referral has not been earned and will not be invented here; add a documented conversion rule if the practice wants one.",
        confidence: "high",
        estimatedValueCents: null,
        valueBasis: "none",
        occurredAt: referral.receivedAt,
        evidence: [
          {
            entityType: "referral",
            entityId: referral.id,
            label: `Referral ${reference}`,
            detail: {
              reference: referral.externalRef,
              received_at: referral.receivedAt,
              status: referral.status,
              progressed_at: referral.progressedAt,
            },
          },
        ],
      });
    }

    return byKey(out);
  },
};

/* -------------------------------------------------------------------------- */

export const overdueRevenueTask: RuleDefinition = {
  id: "RR-AH-008",
  name: "Overdue revenue-related task",
  domain: "allied_health",
  version: 1,
  logicHash: "2b3c4d5e6f708192",
  description:
    "A task the practice itself classified as revenue or continuity work is past its due date and still open.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const revenueTypes = new Set(ctx.settings.revenueTaskTypes.map(norm));

    for (const task of ctx.data.tasks) {
      if (!revenueTypes.has(norm(task.taskType))) continue;
      if (!task.dueAt) continue;
      if (isResolvedTask(task.status)) continue;

      const overdueDays = (ctx.now.getTime() - new Date(task.dueAt).getTime()) / DAY_MS;
      if (overdueDays <= 0) continue;

      const reference = task.externalRef ?? `${task.taskType}-${task.dueAt}`;

      // If this task is chasing an invoice that RR-AH-004 already counts, the
      // money is the same money. It is named here but not counted again.
      const relatedInvoice = invoiceByRef(task.relatedRef, ctx.data.invoices);
      const alreadyCounted =
        relatedInvoice !== null && relatedInvoice.balanceCents > 0 && !isVoidLikeInvoice(relatedInvoice.status);

      out.push({
        findingKey: `RR-AH-008.v1:task:${reference}`,
        title: `${task.taskType} task ${reference} is ${Math.floor(overdueDays)} days overdue`,
        explanation:
          `This task is classed as revenue-related work by the practice's own task type ("${task.taskType}"), it was due on ${task.dueAt.slice(0, 10)}, ` +
          `and its status is still "${task.status}".` +
          (relatedInvoice ? ` It refers to invoice ${relatedInvoice.externalRef}.` : ""),
        calculation: alreadyCounted
          ? `No value is carried here. The ${money(relatedInvoice!.balanceCents)} outstanding on invoice ${relatedInvoice!.externalRef} is already counted once under RR-AH-004.`
          : task.relatedValueCents !== null
            ? `Related value as imported: ${money(task.relatedValueCents)}. Nothing is added to it.`
            : "The task carried no related value, so the finding is raised without a dollar figure.",
        confidence: "high",
        estimatedValueCents: alreadyCounted ? null : task.relatedValueCents,
        valueBasis: alreadyCounted ? "none" : task.relatedValueCents !== null ? "at_risk" : "none",
        occurredAt: task.dueAt,
        evidence: [taskEvidence(task), ...(relatedInvoice ? [invoiceEvidence(relatedInvoice)] : [])],
      });
    }

    return byKey(out);
  },
};

/* -------------------------------------------------------------------------- */

export const inconsistentStatusChain: RuleDefinition = {
  id: "RR-AH-010",
  name: "Inconsistent status chain",
  domain: "allied_health",
  version: 1,
  logicHash: "3c4d5e6f708192a3",
  description:
    "Records that contradict themselves. Always HOLD — the source data needs correcting before any conclusion is safe.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];

    const hold = (
      findingKey: string,
      title: string,
      explanation: string,
      holdReason: string,
      occurredAt: string,
      evidence: RuleOutput["evidence"],
    ) =>
      out.push({
        findingKey,
        title,
        explanation,
        calculation: "No value is claimed. A contradictory record cannot support a number.",
        confidence: "hold" as const,
        estimatedValueCents: null,
        valueBasis: "none" as const,
        holdReason,
        occurredAt,
        evidence,
      });

    for (const invoice of ctx.data.invoices) {
      if (isPaidInvoice(invoice.status) && invoice.balanceCents > 0) {
        hold(
          `RR-AH-010.v1:invoice:${invoice.externalRef}:paid_with_balance`,
          `Invoice ${invoice.externalRef} is marked paid but still shows a balance`,
          `Invoice ${invoice.externalRef} carries the status "${invoice.status}" while ${money(invoice.balanceCents)} remains outstanding on it. One of the two is wrong, and chasing it either way risks contacting a client who has already paid.`,
          "Paid status with a non-zero balance.",
          dateToInstant(invoice.issueDate),
          [invoiceEvidence(invoice)],
        );
      }

      const openish = norm(invoice.status).includes("open") || norm(invoice.status).includes("overdue");
      if (openish && invoice.balanceCents === 0) {
        hold(
          `RR-AH-010.v1:invoice:${invoice.externalRef}:settled_status`,
          `Invoice ${invoice.externalRef} has nothing owing but is still open`,
          `Invoice ${invoice.externalRef} has a zero balance while its status is "${invoice.status}". It is most likely settled and never closed off, but the data cannot confirm that.`,
          "Open or overdue status with a zero balance.",
          dateToInstant(invoice.issueDate),
          [invoiceEvidence(invoice)],
        );
      }
    }

    for (const payment of ctx.data.payments) {
      const invoice = invoiceByRef(payment.invoiceRef, ctx.data.invoices);
      if (!invoice) continue;
      if (payment.paymentDate >= invoice.issueDate) continue;

      const reference = payment.externalRef ?? `${payment.paymentDate}-${payment.amountCents}`;
      hold(
        `RR-AH-010.v1:payment:${reference}:before_invoice`,
        `Payment ${reference} predates the invoice it is applied to`,
        `This payment is dated ${payment.paymentDate}, while invoice ${invoice.externalRef} was issued on ${invoice.issueDate}. Money cannot be applied to an invoice that did not exist yet, so either a date or the allocation is wrong.`,
        "Payment date precedes the issue date of the invoice it is allocated to.",
        dateToInstant(payment.paymentDate),
        [
          {
            entityType: "payment",
            entityId: payment.id,
            label: `Payment ${reference}`,
            detail: {
              reference: payment.externalRef,
              payment_date: payment.paymentDate,
              amount: payment.amountCents,
              applied_to: payment.invoiceRef,
            },
          },
          invoiceEvidence(invoice),
        ],
      );
    }

    for (const appointment of ctx.data.appointments) {
      const completedAndCancelled =
        norm(appointment.status).includes("complete") && appointment.cancellationAt !== null;
      if (completedAndCancelled) {
        hold(
          `RR-AH-010.v1:appointment:${appointment.externalRef}:completed_after_cancellation`,
          `Appointment ${appointment.externalRef} is completed and cancelled at once`,
          `Appointment ${appointment.externalRef} has the status "${appointment.status}" and also carries a cancellation recorded at ${appointment.cancellationAt}. With no correction history in the export, neither reading can be trusted.`,
          "Completed status alongside a cancellation timestamp.",
          appointment.scheduledStart,
          [appointmentEvidence(appointment)],
        );
      }
    }

    for (const referral of ctx.data.referrals) {
      if (isProgressedReferral(referral.status) && !referral.progressedAt) {
        const reference = referral.externalRef ?? referral.receivedAt;
        hold(
          `RR-AH-010.v1:referral:${reference}:progressed_without_date`,
          `Referral ${reference} is progressed with no date`,
          `This referral has the outcome status "${referral.status}" but no date on which it was progressed, so it cannot be told apart from one that was never actioned.`,
          "Outcome status with no progressed-at timestamp.",
          referral.receivedAt,
          [
            {
              entityType: "referral",
              entityId: referral.id,
              label: `Referral ${reference}`,
              detail: {
                reference: referral.externalRef,
                received_at: referral.receivedAt,
                status: referral.status,
                progressed_at: null,
              },
            },
          ],
        );
      }
    }

    return byKey(out);
  },
};
