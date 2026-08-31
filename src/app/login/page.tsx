import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Genevieve App account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const user = await getSessionUser().catch(() => null);
  if (user) redirect("/app");

  const { next, reset } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-9 self-center" aria-label="Genevieve App home">
        <Logo size="md" />
      </Link>

      <div className="gm-card">
        <h1 className="gm-display text-3xl font-semibold">Welcome back</h1>
        <p className="gm-muted mt-1.5 text-sm">Log in to keep tracking every dollar.</p>

        {reset && (
          <p className="mt-4 gm-alert-ok text-sm font-medium">
            Your password has been changed. Log in with your new password.
          </p>
        )}

        <LoginForm next={next} />
      </div>

      <p className="gm-muted mt-6 text-center text-sm">
        New to Genevieve App?{" "}
        <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
          Start free
        </Link>
      </p>
    </main>
  );
}
