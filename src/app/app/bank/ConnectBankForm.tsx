"use client";

import { useActionState } from "react";
import { connectBankAction, type BankState } from "@/lib/actions/bank";
import { SubmitButton } from "@/components/SubmitButton";

export function ConnectBankForm({
  institutions,
  live,
  disabled,
}: {
  institutions: Array<{ id: string; name: string }>;
  live: boolean;
  disabled?: boolean;
}) {
  const [state, action] = useActionState<BankState, FormData>(
    connectBankAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="gm-alert-error" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="institutionId">
          Your bank
        </label>
        <select
          id="institutionId"
          name="institutionId"
          className="gm-input"
          disabled={disabled}
        >
          {institutions.length === 0 && <option value="">Loading banks…</option>}
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>
      </div>

      <p className="gm-muted text-xs leading-relaxed">
        {live ? (
          <>
            You sign in at your own bank, not here. We never see or store your
            banking password, and the connection is read-only — nothing can be
            moved or paid from it. You can disconnect at any time, and consent
            expires after 12 months under the Consumer Data Right.
          </>
        ) : (
          <>
            No data recipient is configured yet, so this connects a demo bank
            with realistic Australian transactions. Card purchases arrive as
            pending and settle about a day later, which is exactly how a real
            connection behaves.
          </>
        )}
      </p>

      <SubmitButton
        className="gm-btn-primary w-full"
        pendingLabel="Opening your bank…"
        disabled={disabled}
      >
        {live ? "Connect securely" : "Connect the demo bank"}
      </SubmitButton>
    </form>
  );
}
