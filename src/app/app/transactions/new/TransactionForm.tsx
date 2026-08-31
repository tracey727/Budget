"use client";

import { useActionState, useState } from "react";
import { createTransactionAction, type FormState } from "@/lib/actions/transactions";
import { SubmitButton } from "@/components/SubmitButton";

export function TransactionForm({
  accounts,
  categories,
  trips,
  defaultTripId,
  businessTools,
}: {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; kind: string }>;
  trips: Array<{ id: string; name: string }>;
  defaultTripId?: string;
  businessTools: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createTransactionAction,
    undefined,
  );
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [isBusiness, setIsBusiness] = useState(false);

  // Show income categories for money in, expense categories for money out.
  const relevant = categories.filter((c) =>
    direction === "in" ? c.kind === "income" : c.kind === "expense",
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
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
            defaultValue={today}
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
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gm-label" htmlFor="accountId">Account</label>
          <select id="accountId" name="accountId" className="gm-input" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="gm-label" htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" className="gm-input" defaultValue="">
            <option value="">Uncategorised</option>
            {relevant.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {trips.length > 0 && (
        <div>
          <label className="gm-label" htmlFor="tripId">
            Trip <span className="gm-muted font-normal">(optional)</span>
          </label>
          <select id="tripId" name="tripId" className="gm-input" defaultValue={defaultTripId ?? ""}>
            <option value="">Not part of a trip</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="gm-label" htmlFor="merchant">
          Merchant <span className="gm-muted font-normal">(optional)</span>
        </label>
        <input id="merchant" name="merchant" className="gm-input" maxLength={120} />
      </div>

      <div>
        <label className="gm-label" htmlFor="notes">
          Notes <span className="gm-muted font-normal">(optional)</span>
        </label>
        <textarea id="notes" name="notes" className="gm-input" rows={2} maxLength={1000} />
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
              <input type="checkbox" name="hasGst" className="h-4 w-4 accent-brand-600" />
              Amount includes GST (10%)
            </label>
          )}
        </div>
      )}

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Saving…">
        Save transaction
      </SubmitButton>
    </form>
  );
}
