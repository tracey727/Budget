"use client";

import { useActionState } from "react";
import { dismissFindingAction } from "@/lib/rescue/actions/findings";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";
import { DISMISS_REASONS } from "@/lib/rescue/labels";

/** Dismissal always takes a reason. The reason is kept, and it is auditable. */
export function DismissPanel({ findingId }: { findingId: string }) {
  const [state, dismiss] = useActionState(dismissFindingAction, undefined);

  return (
    <section className="gm-card space-y-3">
      <h2 className="font-semibold">Dismiss</h2>
      <p className="gm-muted text-sm">
        Use this when the finding is not leakage. It stays visible in the audit trail with your reason
        attached.
      </p>

      <form action={dismiss} className="space-y-3">
        <input type="hidden" name="findingId" value={findingId} />
        <Notice state={state} />

        <div>
          <label className="gm-label" htmlFor="reasonCode">
            Reason
          </label>
          <select id="reasonCode" name="reasonCode" className="gm-input" required>
            {DISMISS_REASONS.map((reason) => (
              <option key={reason.code} value={reason.code}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="gm-label" htmlFor="reasonNote">
            In your own words
          </label>
          <textarea id="reasonNote" name="reasonNote" rows={2} className="gm-input" required minLength={5} />
        </div>

        <SubmitButton className="gm-btn-secondary" pendingLabel="Dismissing…">
          Dismiss finding
        </SubmitButton>
      </form>
    </section>
  );
}
