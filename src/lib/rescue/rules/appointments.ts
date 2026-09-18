/**
 * Appointment-side leakage rules: RR-AH-001, 002, 003 and 007.
 *
 * All four answer the same commercial question from different angles — the
 * diary held time that did not turn into paid, delivered work. None of them
 * invents a dollar value: where the export does not carry a service value, the
 * finding is raised with no number rather than an estimate.
 */

import { DAY_MS, HOUR_MS, dateDaysBetween } from "../time";
import type { RuleContext, RuleDefinition, RuleOutput } from "../types";
import {
  appointmentEvidence,
  byKey,
  isCancelled,
  isCompletedAppointment,
  isLateCancelled,
  isNoShow,
  isOpenWaitlist,
  money,
  replacementBooking,
  slotWindow,
  tasksFor,
  taskEvidence,
  todayInZone,
} from "./helpers";

/* -------------------------------------------------------------------------- */

export const cancelledSlotNotRefilled: RuleDefinition = {
  id: "RR-AH-001",
  name: "Cancelled slot not refilled",
  domain: "allied_health",
  version: 1,
  logicHash: "a1f4c0d2e7b34918",
  description:
    "A cancelled appointment released time in the diary and no replacement booking was found in that window.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const leadMs = ctx.settings.refillLeadHours * HOUR_MS;

    for (const appointment of ctx.data.appointments) {
      if (!isCancelled(appointment.status)) continue;

      const window = slotWindow(appointment);
      // A slot further out than the lead time can still be refilled, so it is
      // not leakage yet and raising it would only create noise.
      if (window.start - ctx.now.getTime() > leadMs) continue;

      const key = `RR-AH-001.v1:appointment:${appointment.externalRef}`;
      const evidence = [appointmentEvidence(appointment)];
      const occurredAt = appointment.cancellationAt ?? appointment.scheduledStart;

      if (appointment.cancellationAt && new Date(appointment.cancellationAt).getTime() > window.start) {
        out.push({
          findingKey: key,
          title: `Cancelled slot ${appointment.externalRef} cannot be assessed`,
          explanation:
            "The cancellation is recorded as happening after the appointment was due to start, so it is not possible to say whether the time was ever released.",
          calculation: "No value is claimed while the timing contradicts itself.",
          confidence: "hold",
          estimatedValueCents: null,
          valueBasis: "none",
          holdReason: "Cancellation timestamp falls after the scheduled start.",
          occurredAt,
          evidence,
        });
        continue;
      }

      if (appointment.serviceValueCents !== null && appointment.serviceValueCents < 0) {
        out.push({
          findingKey: key,
          title: `Cancelled slot ${appointment.externalRef} has a negative service value`,
          explanation:
            "The service value imported for this appointment is negative, which cannot be read as revenue released by a cancellation.",
          calculation: "No value is claimed while the imported amount is negative.",
          confidence: "hold",
          estimatedValueCents: null,
          valueBasis: "none",
          holdReason: "Negative service value on a cancelled appointment.",
          occurredAt,
          evidence,
        });
        continue;
      }

      const replacement = replacementBooking(appointment, ctx.data.appointments);
      if (replacement) continue;

      const hasValue = appointment.serviceValueCents !== null;
      const knownWorker = Boolean(appointment.workerRef);

      out.push({
        findingKey: key,
        title: `Cancelled appointment ${appointment.externalRef} left the slot empty`,
        explanation:
          `Appointment ${appointment.externalRef} was cancelled and no replacement booking appears in the released window` +
          (knownWorker ? ` for practitioner ${appointment.workerRef}.` : ". No practitioner reference was supplied, so every diary was searched.") +
          " That time was held and then not sold.",
        calculation: hasValue
          ? `Service value as imported: ${money(appointment.serviceValueCents)}. Nothing is added to it.`
          : "The export carried no service value for this appointment, so the finding is raised without a dollar figure.",
        confidence: hasValue && knownWorker ? "high" : "medium",
        estimatedValueCents: appointment.serviceValueCents,
        valueBasis: "at_risk",
        occurredAt,
        evidence,
      });
    }

    return byKey(out);
  },
};

/* -------------------------------------------------------------------------- */

export const attendanceReview: RuleDefinition = {
  id: "RR-AH-002",
  name: "No-show or late cancellation needing review",
  domain: "allied_health",
  version: 1,
  logicHash: "b2c7e1904a6d5f83",
  description:
    "A no-show or late cancellation has no recorded administrative outcome. Whether anything is owed is a policy decision for the practice.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const lateMs = ctx.settings.lateCancellationHours * HOUR_MS;

    for (const appointment of ctx.data.appointments) {
      const noShow = isNoShow(appointment.status);
      const cancelled = isCancelled(appointment.status);
      const labelledLate = isLateCancelled(appointment.status);
      if (!noShow && !cancelled) continue;

      const start = new Date(appointment.scheduledStart).getTime();
      const cancelledAt = appointment.cancellationAt ? new Date(appointment.cancellationAt).getTime() : null;
      const key = `RR-AH-002.v1:appointment:${appointment.externalRef}`;

      if (cancelled && labelledLate && cancelledAt === null) {
        out.push({
          findingKey: key,
          title: `Late cancellation ${appointment.externalRef} has no cancellation time`,
          explanation:
            "This appointment is marked as a late cancellation, but no cancellation timestamp was imported, so the practice's late-cancellation policy cannot be applied to it from this data.",
          calculation: "No value is claimed while the cancellation timing is unknown.",
          confidence: "hold",
          estimatedValueCents: null,
          valueBasis: "none",
          holdReason: "Status says late cancellation but no cancellation time was supplied.",
          occurredAt: appointment.scheduledStart,
          evidence: [appointmentEvidence(appointment)],
        });
        continue;
      }

      const late = cancelled && cancelledAt !== null && start - cancelledAt <= lateMs && cancelledAt <= start;
      if (!noShow && !late) continue;

      // Only raise it once the appointment time has actually passed.
      if (ctx.now.getTime() < start) continue;

      const related = tasksFor(appointment.externalRef, ctx.data.tasks);
      const resolved = related.find((task) => {
        const status = task.status.toLowerCase();
        return status.includes("complete") || status.includes("done") || status.includes("resolved") || status.includes("closed");
      });
      if (resolved) continue;

      const evidence = [appointmentEvidence(appointment), ...related.map(taskEvidence)];
      const hoursNotice = cancelledAt !== null ? Math.max(0, Math.round((start - cancelledAt) / HOUR_MS)) : null;

      if (noShow) {
        out.push({
          findingKey: key,
          title: `No-show ${appointment.externalRef} has no recorded outcome`,
          explanation:
            `Appointment ${appointment.externalRef} is recorded as a no-show and no completed follow-up task refers to it. ` +
            "The service value is shown as value at risk so the practice can decide what its policy requires. It is not a debt, and nothing here charges anyone.",
          calculation:
            appointment.serviceValueCents !== null
              ? `Service value as imported: ${money(appointment.serviceValueCents)}, shown as value at risk only.`
              : "No service value was imported, so no figure is shown.",
          confidence: appointment.serviceValueCents !== null ? "high" : "medium",
          estimatedValueCents: appointment.serviceValueCents,
          valueBasis: "at_risk",
          occurredAt: appointment.scheduledStart,
          evidence,
        });
        continue;
      }

      out.push({
        findingKey: key,
        title: `Late cancellation ${appointment.externalRef} has no recorded outcome`,
        explanation:
          `Appointment ${appointment.externalRef} was cancelled ${hoursNotice ?? "fewer than " + ctx.settings.lateCancellationHours} hours before it was due to start, ` +
          `which is inside the ${ctx.settings.lateCancellationHours}-hour late-cancellation window, and no completed follow-up task refers to it.`,
        calculation:
          "No dollar value is carried here. The empty slot itself is already counted once under RR-AH-001, and counting it twice would overstate the total.",
        confidence: "high",
        estimatedValueCents: null,
        valueBasis: "none",
        occurredAt: appointment.cancellationAt ?? appointment.scheduledStart,
        evidence,
      });
    }

    return byKey(out);
  },
};

/* -------------------------------------------------------------------------- */

export const completedServiceNotInvoiced: RuleDefinition = {
  id: "RR-AH-003",
  name: "Completed service without a matched invoice",
  domain: "allied_health",
  version: 1,
  logicHash: "c39a5d6b8e214f70",
  description:
    "Work was delivered and no invoice for that client appears within the grace period.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const grace = ctx.settings.invoiceGraceDays;

    for (const appointment of ctx.data.appointments) {
      if (!isCompletedAppointment(appointment.status)) continue;

      const start = new Date(appointment.scheduledStart);
      const deadline = start.getTime() + grace * DAY_MS;
      if (ctx.now.getTime() < deadline) continue; // still inside the grace period

      const key = `RR-AH-003.v1:appointment:${appointment.externalRef}`;

      if (!appointment.clientRef) {
        out.push({
          findingKey: key,
          title: `Completed appointment ${appointment.externalRef} cannot be matched to an invoice`,
          explanation:
            "This appointment is marked completed, but no client reference was imported with it, so there is no reliable way to tell whether it was invoiced.",
          calculation: "No value is claimed while the appointment cannot be matched.",
          confidence: "hold",
          estimatedValueCents: null,
          valueBasis: "none",
          holdReason: "No client reference on a completed appointment.",
          occurredAt: appointment.scheduledStart,
          evidence: [appointmentEvidence(appointment)],
        });
        continue;
      }

      const serviceDate = start.toISOString().slice(0, 10);
      const match = ctx.data.invoices.find((invoice) => {
        if (invoice.clientRef !== appointment.clientRef) return false;
        const gap = dateDaysBetween(serviceDate, invoice.issueDate);
        return gap >= -1 && gap <= grace;
      });
      if (match) continue;

      out.push({
        findingKey: key,
        title: `Completed appointment ${appointment.externalRef} has no invoice`,
        explanation:
          `The service on ${serviceDate} for client ${appointment.clientRef} is recorded as completed, and no invoice for that client was issued within ${grace} days of it. ` +
          "Work that is delivered and never billed is the most direct form of leakage there is.",
        calculation:
          appointment.serviceValueCents !== null
            ? `Service value as imported: ${money(appointment.serviceValueCents)}. Checked against every invoice for client ${appointment.clientRef} issued between ${serviceDate} and ${grace} days later.`
            : `No service value was imported. Checked against every invoice for client ${appointment.clientRef} issued between ${serviceDate} and ${grace} days later.`,
        confidence: appointment.serviceValueCents !== null ? "high" : "medium",
        estimatedValueCents: appointment.serviceValueCents,
        valueBasis: "at_risk",
        occurredAt: appointment.scheduledStart,
        evidence: [appointmentEvidence(appointment)],
      });
    }

    return byKey(out);
  },
};

/* -------------------------------------------------------------------------- */

export const waitlistOpportunityMissed: RuleDefinition = {
  id: "RR-AH-007",
  name: "Waitlist opportunity missed",
  domain: "allied_health",
  version: 1,
  logicHash: "d47b28e0c9153a6f",
  description:
    "A slot was released while people were waiting for one, and the slot went unfilled.",
  enabledByDefault: true,

  run(ctx: RuleContext): RuleOutput[] {
    const out: RuleOutput[] = [];
    const open = ctx.data.waitlist.filter((entry) => isOpenWaitlist(entry.status));
    if (open.length === 0) return out;

    for (const appointment of ctx.data.appointments) {
      if (!isCancelled(appointment.status)) continue;

      const window = slotWindow(appointment);
      // Only a slot that has already gone past is a missed opportunity.
      if (ctx.now.getTime() < window.start) continue;
      if (replacementBooking(appointment, ctx.data.appointments)) continue;

      const waiting = open.filter((entry) => {
        if (!entry.createdAt) return true; // no join date supplied — still waiting as far as we know
        return new Date(entry.createdAt).getTime() <= window.start;
      });
      if (waiting.length === 0) continue;

      out.push({
        findingKey: `RR-AH-007.v1:appointment:${appointment.externalRef}`,
        title: `${waiting.length} waiting while slot ${appointment.externalRef} went unfilled`,
        explanation:
          `The slot released by appointment ${appointment.externalRef} was never refilled, and ${waiting.length} waitlist ` +
          `${waiting.length === 1 ? "entry was" : "entries were"} open at the time. No offer or outcome was recorded against the slot.`,
        calculation:
          appointment.serviceValueCents !== null
            ? `Potential value only: the slot's own service value of ${money(appointment.serviceValueCents)}. This is an opportunity, not a receivable, and it is kept out of the value-at-risk total.`
            : "No service value was imported for the slot, so no figure is shown.",
        confidence: "low",
        estimatedValueCents: appointment.serviceValueCents,
        valueBasis: "potential",
        occurredAt: appointment.scheduledStart,
        evidence: [
          appointmentEvidence(appointment),
          ...waiting.slice(0, 10).map((entry) => ({
            entityType: "waitlist" as const,
            entityId: entry.id,
            label: `Waitlist ${entry.externalRef ?? entry.clientRef ?? "entry"}`,
            detail: {
              reference: entry.externalRef,
              client: entry.clientRef,
              status: entry.status,
              availability: entry.availability,
              added: entry.createdAt,
            },
          })),
        ],
      });
    }

    return byKey(out);
  },
};

/** Exported for the fixtures, which assert "today" behaviour explicitly. */
export const __testables = { todayInZone };
