"use client";

import { useActionState } from "react";
import { createTripAction } from "@/lib/actions/trips";
import type { FormState } from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";

export function TripForm({ disabled }: { disabled: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createTripAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3.5">
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-300">
          Trip added.
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="name">Trip name</label>
        <input id="name" name="name" className="gm-input" placeholder="The Big Lap" maxLength={80} required />
      </div>

      <div>
        <label className="gm-label" htmlFor="destination">
          Where to <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input id="destination" name="destination" className="gm-input" placeholder="Cape York" maxLength={120} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="gm-label" htmlFor="startsOn">Leaving</label>
          <input id="startsOn" name="startsOn" type="date" className="gm-input" />
        </div>
        <div>
          <label className="gm-label" htmlFor="endsOn">Back</label>
          <input id="endsOn" name="endsOn" type="date" className="gm-input" />
        </div>
      </div>

      <div>
        <label className="gm-label" htmlFor="budgetAmount">
          Trip budget (AUD) <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input id="budgetAmount" name="budgetAmount" className="gm-input" inputMode="decimal" placeholder="4500.00" />
      </div>

      <div>
        <label className="gm-label" htmlFor="plannedKm">
          Planned kilometres <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input id="plannedKm" name="plannedKm" className="gm-input" inputMode="numeric" placeholder="8000" />
      </div>

      <div>
        <label className="gm-label" htmlFor="notes">
          Notes <span className="gm-muted font-normal">(optional)</span>
        </label>
        <textarea id="notes" name="notes" className="gm-input" rows={2} maxLength={1000} />
      </div>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Adding…">
        {disabled ? "Upgrade to add more" : "Add trip"}
      </SubmitButton>
    </form>
  );
}
