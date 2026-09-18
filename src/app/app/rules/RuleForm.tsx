"use client";

import { useActionState } from "react";
import { createRuleAction } from "@/lib/actions/rules";
import type { FormState } from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";

export function RuleForm({
  categories,
  businessTools,
}: {
  categories: Array<{ id: string; name: string }>;
  businessTools: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createRuleAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p role="alert" className="gm-alert-error">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="gm-alert-ok text-sm">Rule saved.</p>}

      <div>
        <label className="gm-label" htmlFor="pattern">
          When the transaction text
        </label>
        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <select id="matchType" name="matchType" className="gm-input" defaultValue="contains">
            <option value="contains">contains</option>
            <option value="starts_with">starts with</option>
            <option value="equals">is exactly</option>
          </select>
          <input
            id="pattern"
            name="pattern"
            className="gm-input"
            placeholder="WOOLWORTHS"
            maxLength={80}
            required
          />
        </div>
      </div>

      <div>
        <label className="gm-label" htmlFor="categoryId">File it under</label>
        <select id="categoryId" name="categoryId" className="gm-input" required>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="gm-label" htmlFor="renameTo">
          And call it <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input
          id="renameTo"
          name="renameTo"
          className="gm-input"
          placeholder="Groceries — Woolworths"
          maxLength={120}
        />
        <p className="gm-muted mt-1 text-xs">
          Replaces the bank&rsquo;s raw text, which is rarely readable.
        </p>
      </div>

      {businessTools && (
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" name="markBusiness" className="h-4 w-4 accent-brand-600" />
          Mark matching transactions as business
        </label>
      )}

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Saving…">
        Add rule
      </SubmitButton>
    </form>
  );
}
