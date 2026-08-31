import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth/session";
import { consumeVerificationToken } from "@/lib/auth/verify";
import { BUSINESS } from "@/lib/business";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getSessionUser().catch(() => null);

  const outcome = token
    ? await consumeVerificationToken(token)
    : user?.emailVerifiedAt
      ? ({ status: "already-verified" } as const)
      : ({ status: "invalid" } as const);

  const verified =
    outcome.status === "verified" || outcome.status === "already-verified";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 self-center" aria-label={`${BUSINESS.appName} home`}>
        <Logo />
      </Link>

      <div className="gm-card text-center">
        {verified ? (
          <>
            <span
              aria-hidden
              className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-500/15 text-2xl"
            >
              ✓
            </span>
            <h1 className="text-2xl font-black tracking-tight">
              {outcome.status === "already-verified"
                ? "Already confirmed"
                : "Email confirmed"}
            </h1>
            <p className="gm-muted mt-2 text-sm leading-relaxed">
              {outcome.status === "already-verified"
                ? "Your email address is already confirmed. Nothing more to do."
                : "Thanks — your email address is confirmed. You can now subscribe to a paid plan, and we can reach you about your account."}
            </p>
            <Link href={user ? "/app" : "/login"} className="gm-btn-primary mt-5 w-full">
              {user ? "Go to your dashboard" : "Log in"}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black tracking-tight">
              This link is no longer valid
            </h1>
            <p className="gm-muted mt-2 text-sm leading-relaxed">
              Confirmation links last 7 days and can only be used once. They also
              stop working if the email address on the account changes. Log in and
              we will send you a fresh one.
            </p>
            <Link href={user ? "/app" : "/login"} className="gm-btn-primary mt-5 w-full">
              {user ? "Go to your dashboard" : "Log in"}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
