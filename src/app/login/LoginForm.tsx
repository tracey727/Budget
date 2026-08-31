"use client";

import { useActionState } from "react";
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
        />
      </div>

      <div>
        <label className="gm-label" htmlFor="password">
          Password
        </label>
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
