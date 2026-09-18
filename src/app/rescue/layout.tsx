import Link from "next/link";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rrFindings } from "@/lib/db/schema";
import { logoutAction } from "@/lib/actions/auth";
import { getTenantContext } from "@/lib/rescue/tenant";
import { OPEN_STATUSES } from "@/lib/rescue/runner";
import { ROLE_LABEL } from "@/lib/rescue/permissions";
import { RescueNav } from "@/components/rescue/RescueNav";
import { DemoFlag } from "@/components/rescue/Band";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ON TRACK Revenue Rescue",
  description:
    "Upload operational exports. Find preventable leakage. Show what needs action. Track what was recovered.",
};

export default async function RescueLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantContext();

  // Someone with no workspace yet gets a bare shell rather than a redirect —
  // the pages underneath send them to /rescue/start themselves, and a layout
  // that redirected would bounce that page straight back to itself.
  if (!context) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-[var(--gm-border)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/rescue" className="gm-display text-lg font-semibold">
              Revenue Rescue
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="gm-muted text-sm hover:text-brand-600">
                Log out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const red = await db()
    .select({ count: sql<string>`count(*)` })
    .from(rrFindings)
    .where(
      and(
        eq(rrFindings.tenantId, context.tenant.id),
        eq(rrFindings.priorityBand, "red"),
        inArray(rrFindings.status, OPEN_STATUSES),
      ),
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[var(--gm-border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/rescue" className="gm-display text-lg font-semibold">
              Revenue Rescue
            </Link>
            {context.tenant.isDemo && <DemoFlag />}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <WorkspaceSwitcher
              current={context.tenant.id}
              options={context.available.map((entry) => ({
                id: entry.tenant.id,
                name: entry.tenant.name,
              }))}
            />
            <span className="gm-pill" title="What your role may do in this workspace">
              {ROLE_LABEL[context.role]}
            </span>
            <span className="gm-muted hidden text-sm sm:inline">{context.viewer.fullName}</span>
            <Link href="/app" className="gm-muted text-sm hover:text-brand-600">
              Budget app
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="gm-muted text-sm hover:text-brand-600">
                Log out
              </button>
            </form>
          </div>
        </div>

        <RescueNav redCount={Number(red[0]?.count ?? 0)} />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-[var(--gm-border)] py-4">
        <p className="gm-muted mx-auto max-w-6xl px-4 text-xs">
          ON TRACK Revenue Rescue™ finds and prioritises preventable leakage. It never charges, refunds,
          writes off or posts anything on your behalf — every finding is reviewed by a person.
        </p>
      </footer>
    </div>
  );
}
