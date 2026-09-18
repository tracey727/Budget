"use client";

import { useActionState } from "react";
import { commitImportAction, discardImportAction } from "@/lib/rescue/actions/imports";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";

export function CommitForm({ jobId, validRows }: { jobId: string; validRows: number }) {
  const [state, action] = useActionState(commitImportAction, undefined);
  const [discardState, discard] = useActionState(discardImportAction, undefined);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <form action={action}>
          <input type="hidden" name="jobId" value={jobId} />
          <SubmitButton pendingLabel="Committing…" disabled={validRows === 0}>
            Commit {validRows} row{validRows === 1 ? "" : "s"}
          </SubmitButton>
        </form>

        <form action={discard}>
          <input type="hidden" name="jobId" value={jobId} />
          <SubmitButton className="gm-btn-secondary" pendingLabel="Discarding…">
            Discard this import
          </SubmitButton>
        </form>
      </div>
      <Notice state={state} />
      <Notice state={discardState} />
    </div>
  );
}
