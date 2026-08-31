import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Gen Money account.",
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
      <Link href="/" className="mb-8 self-center" aria-label="Gen Money home">
        <Logo />
      </Link>

      <div className="gm-card">
        <h1 className="text-2xl font-black tracking-tight">Welcome back</h1>
        <p className="gm-muted mt-1.5 text-sm">Log in to keep tracking every dollar.</p>

        {reset && (
          <p className="mt-4 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-300">
            Your password has been changed. Log in with your new password.
          </p>
        )}

        <LoginForm next={next} />
      </div>

      <p className="gm-muted mt-6 text-center text-sm">
        New to Gen Money?{" "}
        <Link href="/signup" className="font-semibold text-brand-600 hover:underline">
          Start free
        </Link>
      </p>
    </main>
  );
}
