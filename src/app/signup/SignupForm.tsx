"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { AU_STATES } from "@/lib/dates";

export function SignupForm({ plan }: { plan?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    signupAction,
    undefined,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {plan && <input type="hidden" name="plan" value={plan} />}

      {state?.error && (
        <p
          role="alert"
          className="gm-alert-error"
        >
          {state.error}
        </p>
      )}

      <div>
        <label className="gm-label" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          className="gm-input"
          autoComplete="name"
          required
          maxLength={120}
        />
      </div>

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
          autoComplete="new-password"
          minLength={10}
          required
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="gm-muted mt-1 text-xs">
          At least 10 characters.
        </p>
      </div>

      <div>
        <label className="gm-label" htmlFor="state">
          State or territory <span className="gm-muted font-normal">(optional)</span>
        </label>
        <select id="state" name="state" className="gm-input" defaultValue="">
          <option value="">Prefer not to say</option>
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton className="gm-btn-primary w-full" pendingLabel="Creating your account…">
        Create free account
      </SubmitButton>

      <p className="gm-muted text-center text-xs leading-relaxed">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline hover:text-brand-600">
          Terms of Use
        </Link>
        ,{" "}
        <Link href="/subscriptions" className="underline hover:text-brand-600">
          Subscription &amp; Refund Policy
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-brand-600">
          Privacy Policy
        </Link>
        . The Starter plan is free — no payment details are required.
      </p>
    </form>
  );
}
