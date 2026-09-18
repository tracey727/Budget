/**
 * Money-side rules: RR-AH-004, 005 and 009.
 *
 * These are the rules most likely to be argued with, so each one states the
 * threshold it applied and the records it compared. None of them writes to an
 * invoice, raises a credit, or chases anyone — they produce a finding for a
 * person to act on.
 */

import { DAY_MS, dateDaysBetween } from "../time";
import type { Invoice, RuleContext, RuleDefinition, RuleOutput } from "../types";
import {
  byKey,
  dateToInstant,
  invoiceByRef,
  invoiceEvidence,
  isVoidLikeInvoice,
  money,
  norm,
  tasksFor,
  taskEvidence,
  todayInZone,
} from "./helpers";

/* -------------------------------------------------------------------------- */

export const overdueInvoiceNoFollowUp: RuleDefinition = {
  id: "RR-AH-004",
  name: "Overdue invoice without recent follow-up",
  domain: "allied_health",
  version: 1,
  logicHash: "e51c93a7d284b06f",
  description:
    "An invoice is past its due date with a balance owing, and no follow-up task refers to it inside the lookback window.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const today = todayInZone(ctx.now, ctx.timeZone);
    const lookback = ctx.settings.followUpLookbackDays;

    for (const invoice of ctx.data.invoices) {
      if (invoice.balanceCents <= 0) continue;
      if (!invoice.dueDate) continue;
      if (isVoidLikeInvoice(invoice.status)) continue;

      const daysOverdue = dateDaysBetween(invoice.dueDate, today);
      if (daysOverdue <= 0) continue;

      const related = tasksFor(invoice.externalRef, ctx.data.tasks);
      const recent = related.find((task) => {
        if (!task.dueAt) return false;
        const age = (ctx.now.getTime() - new Date(task.dueAt).getTime()) / DAY_MS;
        return age <= lookback; // due recently or still ahead — either way, someone is on it
      });
      if (recent) continue;

      out.push({
        findingKey: `RR-AH-004.v1:invoice:${invoice.externalRef}`,
        title: `Invoice ${invoice.externalRef} is ${daysOverdue} days overdue with no follow-up`,
        explanation:
          `Invoice ${invoice.externalRef} was due on ${invoice.dueDate} and ${money(invoice.balanceCents)} is still outstanding. ` +
          (related.length === 0
            ? "No follow-up task in the imported data refers to it at all."
            : `The ${related.length} task${related.length === 1 ? "" : "s"} that refer to it are all older than the ${lookback}-day follow-up window.`),
        calculation: `Outstanding balance as imported: ${money(invoice.balanceCents)} of a ${money(invoice.totalCents)} invoice. Overdue by ${daysOverdue} days against a due date of ${invoice.dueDate}.`,
        confidence: "high",
        estimatedValueCents: invoice.balanceCents,
        valueBasis: "outstanding",
        occurredAt: dateToInstant(invoice.dueDate),
        evidence: [invoiceEvidence(invoice), ...related.map(taskEvidence)],
      });
    }

    return byKey(out);
  },
};

/* -------------------------------------------------------------------------- */

export const unmatchedPayment: RuleDefinition = {
  id: "RR-AH-005",
  name: "Unmatched payment",
  domain: "allied_health",
  version: 1,
  logicHash: "f60d47b2a9e8315c",
  description:
    "Money was received that could not be allocated to an invoice. This is funds to place, not revenue lost.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];

    for (const payment of ctx.data.payments) {
      const reference = payment.externalRef ?? `${payment.paymentDate}-${payment.amountCents}`;
      const key = `RR-AH-005.v1:payment:${reference}`;
      const evidence = [
        {
          entityType: "payment" as const,
          entityId: payment.id,
          label: `Payment ${payment.externalRef ?? reference}`,
          detail: {
            reference: payment.externalRef,
            payment_date: payment.paymentDate,
            amount: payment.amountCents,
            applied_to: payment.invoiceRef,
          },
        },
      ];

      if (payment.invoiceRef && norm(payment.invoiceRef) !== "") {
        const invoice = invoiceByRef(payment.invoiceRef, ctx.data.invoices);
        if (invoice) continue; // allocated, nothing to see

        out.push({
          findingKey: key,
          title: `Payment ${payment.externalRef ?? reference} names an invoice that is not in the data`,
          explanation:
            `This payment of ${money(payment.amountCents)} is recorded against invoice ${payment.invoiceRef}, but no invoice with that reference was imported. ` +
            "Either the invoice export is incomplete or the reference is wrong, and both need a person to look.",
          calculation: "No value is claimed while the payment points at an invoice that cannot be found.",
          confidence: "hold",
          estimatedValueCents: null,
          valueBasis: "none",
          holdReason: `Payment references invoice ${payment.invoiceRef}, which is absent from the imported invoices.`,
          occurredAt: dateToInstant(payment.paymentDate),
          evidence,
        });
        continue;
      }

      out.push({
        findingKey: key,
        title: `Payment of ${money(payment.amountCents)} is not allocated to an invoice`,
        explanation:
          `A payment of ${money(payment.amountCents)} was received on ${payment.paymentDate} with no invoice reference against it. ` +
          "This is money already in the bank that has not been matched — it is not lost revenue, and it should not be chased as a debt until it is allocated.",
        calculation: `Payment amount as imported: ${money(payment.amountCents)}, shown as unmatched funds. It is deliberately kept out of the value-at-risk total.`,
        confidence: "high",
        estimatedValueCents: payment.amountCents,
        valueBasis: "unmatched",
        occurredAt: dateToInstant(payment.paymentDate),
        evidence,
      });
    }

    return byKey(out);
  },
};

/* -------------------------------------------------------------------------- */

function duplicateKey(a: Invoice, b: Invoice): string {
  const refs = [a.externalRef, b.externalRef].sort((x, y) => x.localeCompare(y));
  return `RR-AH-009.v1:invoice-pair:${refs[0]}|${refs[1]}`;
}

export const duplicateInvoiceCandidate: RuleDefinition = {
  id: "RR-AH-009",
  name: "Duplicate invoice candidate",
  domain: "allied_health",
  version: 1,
  logicHash: "091e6c58fa7d24b3",
  description:
    "Two invoices for the same client, the same amount and dates close together. A candidate for review, never an automatic credit.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const window = ctx.settings.duplicateInvoiceWindowDays;

    const invoices = ctx.data.invoices.filter((invoice) => invoice.clientRef && invoice.totalCents !== 0);
    const seen = new Set<string>();

    for (let i = 0; i < invoices.length; i += 1) {
      for (let j = i + 1; j < invoices.length; j += 1) {
        const a = invoices[i];
        const b = invoices[j];
        if (a.externalRef === b.externalRef) continue;
        if (a.clientRef !== b.clientRef) continue;
        if (a.totalCents !== b.totalCents) continue;

        const gap = Math.abs(dateDaysBetween(a.issueDate, b.issueDate));
        if (gap > window) continue;

        const key = duplicateKey(a, b);
        if (seen.has(key)) continue;
        seen.add(key);

        const evidence = [invoiceEvidence(a), invoiceEvidence(b)];
        const later = a.issueDate >= b.issueDate ? a : b;

        if (isVoidLikeInvoice(a.status) || isVoidLikeInvoice(b.status)) {
          out.push({
            findingKey: key,
            title: `Invoices ${a.externalRef} and ${b.externalRef} may be a legitimate reissue`,
            explanation:
              `These two invoices match on client, amount and date, but one of them carries the status "${isVoidLikeInvoice(a.status) ? a.status : b.status}". ` +
              "That is the pattern of a credit and reissue rather than a duplicate, so this is held instead of being called a duplicate.",
            calculation: "No value is claimed while the pair may be a deliberate reissue.",
            confidence: "hold",
            estimatedValueCents: null,
            valueBasis: "none",
            holdReason: "One invoice in the pair is voided, credited or reissued.",
            occurredAt: dateToInstant(later.issueDate),
            evidence,
          });
          continue;
        }

        out.push({
          findingKey: key,
          title: `Invoices ${a.externalRef} and ${b.externalRef} look like duplicates`,
          explanation:
            `Client ${a.clientRef} has two invoices of ${money(a.totalCents)} issued ${gap === 0 ? "on the same day" : `${gap} day${gap === 1 ? "" : "s"} apart`} (${a.issueDate} and ${b.issueDate}). ` +
            "Nothing has been credited or voided — this is flagged for a person to check against the service records.",
          calculation: `Duplicate candidate amount: ${money(later.totalCents)}, taken from invoice ${later.externalRef}. Matched on client reference, exact total and an issue-date gap within ${window} days.`,
          confidence: "medium",
          estimatedValueCents: later.totalCents,
          valueBasis: "duplicate",
          occurredAt: dateToInstant(later.issueDate),
          evidence,
        });
      }
    }

    return byKey(out);
  },
};
