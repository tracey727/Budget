import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth/session";
import { emailConfigured } from "@/lib/email/send";
import { BUSINESS } from "@/lib/business";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Send yourself a link to choose a new password.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const user = await getSessionUser().catch(() => null);
  if (user) redirect("/app");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 self-center" aria-label={`${BUSINESS.appName} home`}>
        <Logo />
      </Link>

      <div className="gm-card">
        <h1 className="text-2xl font-black tracking-tight">Forgot your password?</h1>
        <p className="gm-muted mt-1.5 text-sm">
          Enter your email and we will send you a link to choose a new one.
        </p>

        {!emailConfigured() && (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Email delivery is not configured on this deployment, so the reset
            link cannot be sent yet. Set <code className="font-mono">RESEND_API_KEY</code>{" "}
            to enable it.
          </p>
        )}

        <ForgotPasswordForm />
      </div>

      <p className="gm-muted mt-6 text-center text-sm">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
