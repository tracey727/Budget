"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestResetAction, type ResetState } from "@/lib/actions/reset";
import { SubmitButton } from "@/components/SubmitButton";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ResetState, FormData>(
    requestResetAction,
    undefined,
  );

  if (state?.sent) {
    return (
      <div className="mt-6">
        <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-3 text-sm">
          <span className="font-semibold text-brand-700 dark:text-brand-300">
            Check your inbox.
          </span>{" "}
          If an account exists for that address, we have sent a link to choose a
          new password. It expires in 1 hour.
        </p>
        <p className="gm-muted mt-3 text-xs leading-relaxed">
          No email after a few minutes? Check your junk folder, and make sure you
          used the address you signed up with.
        </p>
        <Link href="/login" className="gm-btn-secondary mt-4 w-full">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="gm-input"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
        />
      </div>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
