"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/lib/rescue/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";
import type { RuleSettings } from "@/lib/rescue/types";

const FIELDS: { key: keyof RuleSettings; label: string; help: string; unit: string }[] = [
  {
    key: "refillLeadHours",
    label: "Refill lead time",
    help: "A cancelled slot starting further away than this can still be refilled, so it is not raised yet. (RR-AH-001)",
    unit: "hours",
  },
  {
    key: "lateCancellationHours",
    label: "Late cancellation window",
    help: "A cancellation this close to the start counts as late. (RR-AH-002)",
    unit: "hours",
  },
  {
    key: "invoiceGraceDays",
    label: "Invoice grace period",
    help: "How long after a completed service an invoice may take to appear. (RR-AH-003)",
    unit: "days",
  },
  {
    key: "followUpLookbackDays",
    label: "Follow-up lookback",
    help: "How recently someone must have chased an overdue invoice for it to count. (RR-AH-004)",
    unit: "days",
  },
  {
    key: "referralProgressDays",
    label: "Referral threshold",
    help: "How long a referral may sit before it is treated as not progressed. (RR-AH-006)",
    unit: "days",
  },
  {
    key: "duplicateInvoiceWindowDays",
    label: "Duplicate invoice window",
    help: "How close together two matching invoices must be to be flagged as candidates. (RR-AH-009)",
    unit: "days",
  },
];

export function SettingsForm({ settings }: { settings: RuleSettings }) {
  const [state, action] = useActionState(updateSettingsAction, undefined);

  return (
    <form action={action} className="gm-card space-y-4">
      <h2 className="font-semibold">Detection thresholds</h2>
      <Notice state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="gm-label" htmlFor={field.key}>
              {field.label} ({field.unit})
            </label>
            <input
              id={field.key}
              name={field.key}
              type="number"
              min={0}
              defaultValue={String(settings[field.key])}
              className="gm-input"
              required
            />
            <p className="gm-muted mt-1 text-xs">{field.help}</p>
          </div>
        ))}
      </div>

      <div>
        <label className="gm-label" htmlFor="revenueTaskTypes">
          Revenue-related task types
        </label>
        <input
          id="revenueTaskTypes"
          name="revenueTaskTypes"
          defaultValue={settings.revenueTaskTypes.join(", ")}
          className="gm-input"
          required
        />
        <p className="gm-muted mt-1 text-xs">
          Comma separated, matching the task types in your export. Only these are treated as revenue or
          continuity work when they run overdue. (RR-AH-008)
        </p>
      </div>

      <p className="gm-muted text-xs">
        Changing a threshold does not rewrite existing findings. It applies from the next detection run.
      </p>

      <SubmitButton pendingLabel="Saving…">Save thresholds</SubmitButton>
    </form>
  );
}
