"use client";

import { useActionState } from "react";
import { upsertBudgetAction } from "@/lib/actions/budgets";
import type { FormState } from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";

export function BudgetForm({
  month,
  categories,
}: {
  month: string;
  categories: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    upsertBudgetAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3.5">
      <input type="hidden" name="periodStart" value={month} />

      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-300">
          Budget saved.
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="categoryId">Category</label>
        <select id="categoryId" name="categoryId" className="gm-input" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="gm-label" htmlFor="limitAmount">Monthly limit (AUD)</label>
        <input
          id="limitAmount"
          name="limitAmount"
          className="gm-input"
          inputMode="decimal"
          placeholder="400.00"
          required
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input type="checkbox" name="rollover" className="h-4 w-4 accent-brand-600" />
        Roll unspent amount into next month
      </label>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Saving…">
        Save budget
      </SubmitButton>

      <p className="gm-muted text-xs">
        Setting a budget for a category that already has one this month updates it.
      </p>
    </form>
  );
}
