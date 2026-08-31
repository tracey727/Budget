"use client";

import { useActionState } from "react";
import { createBillAction } from "@/lib/actions/bills";
import type { FormState } from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";
import { FREQUENCY_OPTIONS } from "@/lib/labels";

export function BillForm({
  categories,
  accounts,
}: {
  categories: Array<{ id: string; name: string }>;
  accounts: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createBillAction,
    undefined,
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3.5">
      {state?.error && (
        <p role="alert" className="gm-alert-error">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="gm-alert-ok text-sm font-medium">
          Bill added.
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="name">Bill name</label>
        <input id="name" name="name" className="gm-input" placeholder="Electricity" maxLength={80} required />
      </div>

      <div>
        <label className="gm-label" htmlFor="amount">Amount (AUD)</label>
        <input id="amount" name="amount" className="gm-input" inputMode="decimal" placeholder="180.00" required />
      </div>

      <div>
        <label className="gm-label" htmlFor="frequency">Frequency</label>
        <select id="frequency" name="frequency" className="gm-input" defaultValue="monthly">
          {FREQUENCY_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="gm-label" htmlFor="nextDueOn">Next due</label>
        <input id="nextDueOn" name="nextDueOn" type="date" className="gm-input" defaultValue={today} required />
      </div>

      <div>
        <label className="gm-label" htmlFor="categoryId">
          Category <span className="gm-muted font-normal">(optional)</span>
        </label>
        <select id="categoryId" name="categoryId" className="gm-input" defaultValue="">
          <option value="">None</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="gm-label" htmlFor="accountId">
          Paid from <span className="gm-muted font-normal">(optional)</span>
        </label>
        <select id="accountId" name="accountId" className="gm-input" defaultValue="">
          <option value="">None</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input type="checkbox" name="autoPay" className="h-4 w-4 accent-brand-600" />
        Paid automatically
      </label>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Adding…">
        Add bill
      </SubmitButton>
    </form>
  );
}
