import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AppNav } from "@/components/app/AppNav";
import { requireUser } from "@/lib/auth/require";
import { logoutAction } from "@/lib/actions/auth";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const plan = PLANS[user.activePlan];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[var(--gm-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/app" aria-label="Gen Money dashboard">
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/app/billing"
              className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                user.activePlan === "starter"
                  ? "bg-ink-200 text-ink-700 dark:bg-ink-800 dark:text-ink-200"
                  : "bg-brand-500/15 text-brand-700 dark:text-brand-300"
              }`}
            >
              {plan.name}
            </Link>

            <span className="gm-muted hidden text-sm sm:inline">{user.fullName}</span>

            <form action={logoutAction}>
              <button type="submit" className="gm-muted text-sm hover:text-brand-600">
                Log out
              </button>
            </form>
          </div>
        </div>

        <AppNav />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
