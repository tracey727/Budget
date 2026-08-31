"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <p
          role="alert"
          className="gm-alert-error"
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
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label className="gm-label mb-0" htmlFor="password">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          className="gm-input"
          autoComplete="current-password"
          required
        />
      </div>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
