"use client";

import { useActionState } from "react";
import { createGoalAction } from "@/lib/actions/goals";
import type { FormState } from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";
import { GOAL_KIND_OPTIONS } from "@/lib/labels";

export function GoalForm({ disabled }: { disabled: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createGoalAction,
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
          Goal created.
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="name">Goal name</label>
        <input id="name" name="name" className="gm-input" placeholder="Emergency fund" maxLength={80} required />
      </div>

      <div>
        <label className="gm-label" htmlFor="kind">Type</label>
        <select id="kind" name="kind" className="gm-input" defaultValue="other">
          {GOAL_KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="gm-label" htmlFor="targetAmount">Target (AUD)</label>
        <input id="targetAmount" name="targetAmount" className="gm-input" inputMode="decimal" placeholder="10000.00" required />
      </div>

      <div>
        <label className="gm-label" htmlFor="savedAmount">Already saved (AUD)</label>
        <input id="savedAmount" name="savedAmount" className="gm-input" inputMode="decimal" placeholder="0.00" defaultValue="0" />
      </div>

      <div>
        <label className="gm-label" htmlFor="targetDate">
          Target date <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input id="targetDate" name="targetDate" type="date" className="gm-input" />
      </div>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Creating…">
        {disabled ? "Upgrade to add more" : "Create goal"}
      </SubmitButton>
    </form>
  );
}
