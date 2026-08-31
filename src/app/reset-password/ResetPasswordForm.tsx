"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "@/lib/actions/reset";
import { SubmitButton } from "@/components/SubmitButton";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <p
          role="alert"
          className="gm-alert-error"
        >
          {state.error}
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="gm-input"
          autoComplete="new-password"
          minLength={10}
          required
          autoFocus
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="gm-muted mt-1 text-xs">
          At least 10 characters.
        </p>
      </div>

      <div>
        <label className="gm-label" htmlFor="confirm">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          className="gm-input"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
