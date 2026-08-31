"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importCsvAction, type ImportState } from "@/lib/actions/import";
import { SubmitButton } from "@/components/SubmitButton";

export function ImportForm({
  accounts,
}: {
  accounts: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<ImportState, FormData>(
    importCsvAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state && "error" in state && (
        <p role="alert" className="gm-alert-error">
          {state.error}
        </p>
      )}

      {state && "ok" in state && (
        <div className="gm-alert-ok">
          <p className="font-semibold text-brand-700 dark:text-brand-300">
            Imported {state.imported} transaction{state.imported === 1 ? "" : "s"}.
          </p>
          <ul className="gm-muted mt-1.5 space-y-0.5 text-xs">
            {state.duplicates > 0 && <li>{state.duplicates} already imported, skipped.</li>}
            {state.skipped > 0 && <li>{state.skipped} row(s) could not be read.</li>}
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <Link
            href="/app/transactions"
            className="mt-2 inline-block font-semibold text-brand-600 hover:underline"
          >
            View transactions →
          </Link>
        </div>
      )}

      <div>
        <label className="gm-label" htmlFor="accountId">Import into</label>
        <select id="accountId" name="accountId" className="gm-input" required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="gm-label" htmlFor="file">CSV file</label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv,text/plain"
          className="gm-input file:mr-3 file:rounded file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          required
        />
        <p className="gm-muted mt-1 text-xs">Up to 2 MB.</p>
      </div>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Importing…">
        Import transactions
      </SubmitButton>
    </form>
  );
}
