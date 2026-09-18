"use client";

import { useActionState, useState } from "react";
import {
  createTransactionAction,
  updateTransactionAction,
  type FormState,
} from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";

/** The fields an existing transaction fills the form with. */
export type TransactionInitial = {
  id: string;
  accountId: string;
  categoryId: string | null;
  amount: string;
  direction: "in" | "out";
  description: string;
  merchant: string;
  occurredOn: string;
  notes: string;
  isBusiness: boolean;
  hasGst: boolean;
  status: string;
  /** Bank-sourced rows have fields the bank owns and we must not overwrite. */
  fromBank: boolean;
};

export function TransactionForm({
  accounts,
  categories,
  businessTools,
  initial,
}: {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; kind: string }>;
  businessTools: boolean;
  initial?: TransactionInitial;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    initial ? updateTransactionAction : createTransactionAction,
    undefined,
  );
  const [direction, setDirection] = useState<"in" | "out">(
    initial?.direction ?? "out",
  );
  const [isBusiness, setIsBusiness] = useState(initial?.isBusiness ?? false);
  const locked = initial?.fromBank ?? false;

  // Show income categories for money in, expense categories for money out.
  const relevant = categories.filter((c) =>
    direction === "in" ? c.kind === "income" : c.kind === "expense",
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      {locked && (
        <p className="gm-alert-gold text-sm leading-relaxed">
          This transaction came from your bank, so the amount, date and account
          are theirs to set — they would be put back on the next sync. Category,
          notes and the business flags are yours to change.
        </p>
      )}

      {state?.error && (
        <p
          role="alert"
          className="gm-alert-error"
        >
          {state.error}
        </p>
      )}

      <fieldset>
        <legend className="gm-label">Direction</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: "out", label: "Money out" },
              { key: "in", label: "Money in" },
            ] as const
          ).map((option) => (
            <label
              key={option.key}
              className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition ${
                direction === option.key
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "border-[var(--gm-border)]"
              }`}
            >
              <input
                type="radio"
                name="direction"
                value={option.key}
                checked={direction === option.key}
                onChange={() => setDirection(option.key)}
                disabled={locked}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gm-label" htmlFor="amount">Amount (AUD)</label>
          <input
            id="amount"
            name="amount"
            className="gm-input"
            inputMode="decimal"
            placeholder="42.50"
            defaultValue={initial?.amount ?? ""}
            readOnly={locked}
            required
          />
        </div>
        <div>
          <label className="gm-label" htmlFor="occurredOn">Date</label>
          <input
            id="occurredOn"
            name="occurredOn"
            type="date"
            className="gm-input"
            defaultValue={initial?.occurredOn ?? today}
            readOnly={locked}
            required
          />
        </div>
      </div>

      <div>
        <label className="gm-label" htmlFor="description">Description</label>
        <input
          id="description"
          name="description"
          className="gm-input"
          placeholder="Woolworths weekly shop"
          maxLength={200}
          defaultValue={initial?.description ?? ""}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gm-label" htmlFor="accountId">Account</label>
          <select
            id="accountId"
            name="accountId"
            className="gm-input"
            defaultValue={initial?.accountId ?? ""}
            disabled={locked}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="gm-label" htmlFor="categoryId">Category</label>
          <select
            id="categoryId"
            name="categoryId"
            className="gm-input"
            defaultValue={initial?.categoryId ?? ""}
          >
            <option value="">Uncategorised</option>
            {relevant.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="gm-label" htmlFor="merchant">
          Merchant <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input
          id="merchant"
          name="merchant"
          className="gm-input"
          maxLength={120}
          defaultValue={initial?.merchant ?? ""}
        />
      </div>

      <div>
        <label className="gm-label" htmlFor="notes">
          Notes <span className="gm-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          className="gm-input"
          rows={2}
          maxLength={1000}
          defaultValue={initial?.notes ?? ""}
        />
      </div>

      {businessTools && (
        <div className="space-y-2.5 rounded-lg border border-[var(--gm-border)] p-3.5">
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              name="isBusiness"
              checked={isBusiness}
              onChange={(e) => setIsBusiness(e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            This is a business transaction
          </label>

          {isBusiness && (
            <label className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                name="hasGst"
                defaultChecked={initial?.hasGst ?? false}
                className="h-4 w-4 accent-brand-600"
              />
              Amount includes GST (10%)
            </label>
          )}
        </div>
      )}

      {!locked && (
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="status"
            value="pending"
            defaultChecked={initial?.status === "pending"}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span>
            Not cleared yet
            <span className="gm-muted block text-xs">
              Keeps it out of your cleared balance but still deducts it from what
              is safe to spend — the way a card purchase behaves before the bank
              settles it.
            </span>
          </span>
        </label>
      )}

      {initial && (
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="createRule" className="mt-0.5 h-4 w-4 accent-brand-600" />
          <span>
            Categorise this merchant automatically from now on
            <span className="gm-muted block text-xs">
              Future transactions matching this name go straight into the
              category you chose above.
            </span>
          </span>
        </label>
      )}

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Saving…">
        {initial ? "Save changes" : "Save transaction"}
      </SubmitButton>
    </form>
  );
}
