import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth/session";
import { resolveResetToken } from "@/lib/auth/reset";
import { BUSINESS } from "@/lib/business";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await getSessionUser().catch(() => null);
  if (user) redirect("/app");

  const { token } = await searchParams;
  const valid = token ? await resolveResetToken(token) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 self-center" aria-label={`${BUSINESS.appName} home`}>
        <Logo />
      </Link>

      <div className="gm-card">
        {valid ? (
          <>
            <h1 className="text-2xl font-black tracking-tight">Choose a new password</h1>
            <p className="gm-muted mt-1.5 text-sm">
              Signing in again everywhere else will be required after this.
            </p>
            <ResetPasswordForm token={token!} />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black tracking-tight">This link has expired</h1>
            <p className="gm-muted mt-2 text-sm leading-relaxed">
              Password reset links last 1 hour and can only be used once. Request
              a new one and we will email it straight away.
            </p>
            <Link href="/forgot-password" className="gm-btn-primary mt-5 w-full">
              Send a new link
            </Link>
            <Link href="/login" className="gm-btn-secondary mt-2 w-full">
              Back to log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
