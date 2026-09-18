/**
 * The canonical shape of each import source.
 *
 * A customer's export will not use these names — that is what the mapping step
 * is for. What matters here is that every canonical field declares its type and
 * whether it is required, because validation is driven entirely from this
 * table rather than from ad-hoc checks scattered through the importer.
 */

import type { SourceType } from "./types";

export type FieldType = "text" | "date" | "datetime" | "money" | "ref";

export type CanonicalField = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  help: string;
  /** Header names commonly seen in the wild, used to pre-fill the mapping. */
  aliases: string[];
};

export type SourceDefinition = {
  type: SourceType;
  label: string;
  description: string;
  fields: CanonicalField[];
};

export const SOURCES: Record<SourceType, SourceDefinition> = {
  appointments: {
    type: "appointments",
    label: "Appointments",
    description:
      "Booked, completed, cancelled and no-show appointments, with the service value where your system exports it.",
    fields: [
      {
        key: "appointment_ref",
        label: "Appointment reference",
        type: "ref",
        required: true,
        help: "The unique ID your practice system gives the appointment.",
        aliases: ["appointment_id", "booking_ref", "booking_id", "id", "ref"],
      },
      {
        key: "client_ref",
        label: "Client reference",
        type: "ref",
        required: false,
        help: "An identifier only — do not map a name or any clinical field.",
        aliases: ["client_id", "patient_ref", "patient_id", "customer_ref"],
      },
      {
        key: "worker_ref",
        label: "Practitioner reference",
        type: "ref",
        required: false,
        help: "Needed to tell whether a released slot was refilled.",
        aliases: ["practitioner_ref", "practitioner_id", "clinician", "staff_ref", "worker_id"],
      },
      {
        key: "scheduled_start",
        label: "Scheduled start",
        type: "datetime",
        required: true,
        help: "When the appointment was due to start.",
        aliases: ["start", "start_time", "appointment_start", "starts_at"],
      },
      {
        key: "scheduled_end",
        label: "Scheduled end",
        type: "datetime",
        required: false,
        help: "Used to work out the released window.",
        aliases: ["end", "end_time", "appointment_end", "ends_at"],
      },
      {
        key: "status",
        label: "Status",
        type: "text",
        required: true,
        help: "booked, completed, cancelled, late_cancelled or no_show.",
        aliases: ["appointment_status", "state"],
      },
      {
        key: "service_value",
        label: "Service value",
        type: "money",
        required: false,
        help: "Left blank, the finding carries no dollar value rather than a guess.",
        aliases: ["fee", "amount", "price", "value", "service_fee"],
      },
      {
        key: "cancellation_at",
        label: "Cancelled at",
        type: "datetime",
        required: false,
        help: "When the cancellation was recorded — decides late vs ordinary.",
        aliases: ["cancelled_at", "cancellation_time", "cancelled_on"],
      },
    ],
  },

  invoices: {
    type: "invoices",
    label: "Invoices",
    description: "Issued invoices with their current balance.",
    fields: [
      {
        key: "invoice_ref",
        label: "Invoice number",
        type: "ref",
        required: true,
        help: "The invoice number as it appears to the customer.",
        aliases: ["invoice_id", "invoice_number", "number", "id", "ref"],
      },
      {
        key: "client_ref",
        label: "Client reference",
        type: "ref",
        required: false,
        help: "Links the invoice to the service that earned it.",
        aliases: ["client_id", "patient_ref", "customer_ref", "account_ref"],
      },
      {
        key: "issue_date",
        label: "Issue date",
        type: "date",
        required: true,
        help: "The date the invoice was raised.",
        aliases: ["date", "invoice_date", "issued", "issued_on"],
      },
      {
        key: "due_date",
        label: "Due date",
        type: "date",
        required: false,
        help: "Without it, an invoice cannot be called overdue.",
        aliases: ["due", "payment_due", "due_on"],
      },
      {
        key: "total",
        label: "Invoice total",
        type: "money",
        required: true,
        help: "The full amount of the invoice.",
        aliases: ["amount", "invoice_total", "gross", "total_amount"],
      },
      {
        key: "balance",
        label: "Balance outstanding",
        type: "money",
        required: true,
        help: "What is still owed today. Zero for a paid invoice.",
        aliases: ["outstanding", "amount_due", "balance_due", "owing"],
      },
      {
        key: "status",
        label: "Status",
        type: "text",
        required: true,
        help: "open, paid, overdue, void, credited.",
        aliases: ["invoice_status", "state"],
      },
    ],
  },

  payments: {
    type: "payments",
    label: "Payments",
    description: "Money received, and the invoice it was applied to.",
    fields: [
      {
        key: "payment_ref",
        label: "Payment reference",
        type: "ref",
        required: false,
        help: "Your system's receipt or payment ID.",
        aliases: ["payment_id", "receipt_ref", "receipt", "id", "ref"],
      },
      {
        key: "payment_date",
        label: "Payment date",
        type: "date",
        required: true,
        help: "The date the money was received.",
        aliases: ["date", "received_on", "paid_on", "transaction_date"],
      },
      {
        key: "amount",
        label: "Amount",
        type: "money",
        required: true,
        help: "The amount received.",
        aliases: ["payment_amount", "value", "paid", "total"],
      },
      {
        key: "invoice_ref",
        label: "Applied to invoice",
        type: "ref",
        required: false,
        help: "Blank here is exactly what rule RR-AH-005 looks for.",
        aliases: ["invoice_id", "invoice_number", "applied_to", "allocation"],
      },
    ],
  },

  referrals: {
    type: "referrals",
    label: "Referrals",
    description: "Referrals received and whether they went anywhere.",
    fields: [
      {
        key: "referral_ref",
        label: "Referral reference",
        type: "ref",
        required: false,
        help: "Your system's referral ID.",
        aliases: ["referral_id", "id", "ref"],
      },
      {
        key: "received_at",
        label: "Received at",
        type: "datetime",
        required: true,
        help: "When the referral arrived.",
        aliases: ["received", "date_received", "created_at"],
      },
      {
        key: "status",
        label: "Status",
        type: "text",
        required: true,
        help: "received, booked, accepted, declined or closed.",
        aliases: ["referral_status", "state", "outcome"],
      },
      {
        key: "progressed_at",
        label: "Progressed at",
        type: "datetime",
        required: false,
        help: "When it was booked or otherwise closed out.",
        aliases: ["booked_at", "actioned_at", "closed_at"],
      },
    ],
  },

  waitlist: {
    type: "waitlist",
    label: "Waitlist",
    description: "People waiting for an earlier appointment.",
    fields: [
      {
        key: "waitlist_ref",
        label: "Waitlist reference",
        type: "ref",
        required: false,
        help: "Your system's waitlist entry ID.",
        aliases: ["waitlist_id", "id", "ref"],
      },
      {
        key: "client_ref",
        label: "Client reference",
        type: "ref",
        required: false,
        help: "An identifier only.",
        aliases: ["client_id", "patient_ref", "customer_ref"],
      },
      {
        key: "status",
        label: "Status",
        type: "text",
        required: true,
        help: "open, offered, booked or closed.",
        aliases: ["waitlist_status", "state"],
      },
      {
        key: "availability",
        label: "Availability",
        type: "text",
        required: false,
        help: "Free text, shown to whoever works the finding.",
        aliases: ["available", "preferences", "notes"],
      },
      {
        key: "created_at",
        label: "Added to waitlist",
        type: "datetime",
        required: false,
        help: "Used to check the entry existed before the slot was released.",
        aliases: ["added_at", "created", "date_added"],
      },
    ],
  },

  tasks: {
    type: "tasks",
    label: "Operational tasks",
    description:
      "Follow-up work your team has recorded — this is the evidence that chasing actually happened.",
    fields: [
      {
        key: "task_ref",
        label: "Task reference",
        type: "ref",
        required: false,
        help: "Your system's task ID.",
        aliases: ["task_id", "id", "ref"],
      },
      {
        key: "task_type",
        label: "Task type",
        type: "text",
        required: true,
        help: "invoice_followup, payment_followup, referral_followup, rebooking.",
        aliases: ["type", "category", "kind"],
      },
      {
        key: "due_at",
        label: "Due at",
        type: "datetime",
        required: false,
        help: "Without a due date a task cannot be called overdue.",
        aliases: ["due", "due_date", "deadline"],
      },
      {
        key: "status",
        label: "Status",
        type: "text",
        required: true,
        help: "open, in_progress, completed or cancelled.",
        aliases: ["task_status", "state"],
      },
      {
        key: "related_value",
        label: "Related value",
        type: "money",
        required: false,
        help: "The amount the task is chasing, when your system records it.",
        aliases: ["value", "amount", "related_amount"],
      },
      {
        key: "related_ref",
        label: "Related reference",
        type: "ref",
        required: false,
        help: "The invoice or appointment this task is about. This is what proves follow-up.",
        aliases: ["invoice_ref", "appointment_ref", "linked_ref", "subject_ref"],
      },
    ],
  },
};

export const SOURCE_TYPES = Object.keys(SOURCES) as SourceType[];

export function sourceDefinition(type: string): SourceDefinition | null {
  return (SOURCES as Record<string, SourceDefinition>)[type] ?? null;
}

export function isSourceType(value: string): value is SourceType {
  return Object.prototype.hasOwnProperty.call(SOURCES, value);
}
