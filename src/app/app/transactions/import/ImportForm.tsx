"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  importCsvAction,
  undoImportAction,
  type ImportState,
} from "@/lib/actions/import";
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
          <p className="font-semibold">
            Imported {state.imported} transaction{state.imported === 1 ? "" : "s"}.
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs opacity-80">
            {state.categorised > 0 && (
              <li>{state.categorised} categorised automatically.</li>
            )}
            {state.duplicates > 0 && <li>{state.duplicates} already imported, skipped.</li>}
            {state.skipped > 0 && <li>{state.skipped} row(s) could not be read.</li>}
            {state.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <Link
              href="/app/transactions"
              className="font-semibold hover:underline"
            >
              View transactions →
            </Link>
            {state.imported > 0 && (
              <form action={undoImportAction}>
                <input type="hidden" name="batchId" value={state.batchId} />
                <button type="submit" className="text-xs underline opacity-80 hover:opacity-100">
                  Undo this import
                </button>
              </form>
            )}
          </div>
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
