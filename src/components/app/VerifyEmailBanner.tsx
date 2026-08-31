"use client";

import { useActionState } from "react";
import { resendVerificationAction, type VerifyState } from "@/lib/actions/verify";
import { SubmitButton } from "@/components/SubmitButton";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, formAction] = useActionState<VerifyState, FormData>(
    resendVerificationAction,
    undefined,
  );

  if (state?.sent) {
    return (
      <div className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm">
        <span className="font-semibold text-brand-700 dark:text-brand-300">
          Confirmation sent.
        </span>{" "}
        Check <span className="font-medium">{email}</span>, including your junk
        folder.
      </div>
    );
  }

  return (
    <div className="gm-alert-warn flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          Confirm your email address
        </p>
        <p className="mt-0.5 text-xs opacity-85">
          {state?.error
            ? state.error
            : `We sent a link to ${email}. Confirming it lets us reach you about your account, and is required before subscribing to a paid plan.`}
        </p>
      </div>
      <form action={formAction} className="shrink-0">
        <SubmitButton
          className="gm-btn-secondary py-1.5 text-xs"
          pendingLabel="Sending…"
        >
          Resend link
        </SubmitButton>
      </form>
    </div>
  );
}
