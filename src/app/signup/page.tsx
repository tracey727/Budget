import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "./SignupForm";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start free",
  description: "Create your free Genevieve App account. No credit card required.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await getSessionUser().catch(() => null);
  const { plan } = await searchParams;

  if (user) {
    redirect(plan ? `/api/billing/checkout?plan=${encodeURIComponent(plan)}` : "/app");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 self-center" aria-label="Genevieve App home">
        <Logo />
      </Link>

      <div className="gm-card">
        <h1 className="text-2xl font-black tracking-tight">Start free</h1>
        <p className="gm-muted mt-1.5 text-sm">
          No credit card required. Takes about a minute.
        </p>

        <SignupForm plan={plan} />
      </div>

      <p className="gm-muted mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
