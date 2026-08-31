"use client";

import { useActionState } from "react";
import { createAccountAction } from "@/lib/actions/accounts";
import type { FormState } from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";
import { ACCOUNT_TYPE_OPTIONS } from "@/lib/labels";

export function AccountForm({
  businessTools,
  disabled,
}: {
  businessTools: boolean;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createAccountAction,
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
          Account added.
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="name">Account name</label>
        <input id="name" name="name" className="gm-input" placeholder="Everyday account" maxLength={80} required />
      </div>

      <div>
        <label className="gm-label" htmlFor="type">Type</label>
        <select id="type" name="type" className="gm-input" defaultValue="transaction">
          {ACCOUNT_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="gm-label" htmlFor="institution">
          Institution <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input id="institution" name="institution" className="gm-input" placeholder="Commonwealth Bank" maxLength={80} />
      </div>

      <div>
        <label className="gm-label" htmlFor="openingBalance">Opening balance (AUD)</label>
        <input id="openingBalance" name="openingBalance" className="gm-input" inputMode="decimal" placeholder="0.00" defaultValue="0" />
        <p className="gm-muted mt-1 text-xs">Use a negative amount for a credit card or loan.</p>
      </div>

      {businessTools && (
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" name="isBusiness" className="h-4 w-4 accent-brand-600" />
          Business account
        </label>
      )}

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Adding…">
        {disabled ? "Upgrade to add more" : "Add account"}
      </SubmitButton>
    </form>
  );
}
