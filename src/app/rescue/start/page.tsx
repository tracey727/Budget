import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { membershipsFor, TIMEZONES } from "@/lib/rescue/tenant";
import { StartForm } from "./StartForm";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const viewer = await requireUser("/rescue/start");
  const memberships = await membershipsFor(viewer.id);

  // Already a member of something: nothing to create.
  if (memberships.length > 0) redirect("/rescue");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="gm-display text-3xl font-semibold">ON TRACK Revenue Rescue™</h1>
      <p className="gm-muted mt-2 text-sm">
        Upload your operational exports. See where money and work are falling through the gaps, what needs
        doing about it, and what you actually got back.
      </p>

      <div className="gm-rule my-8" />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="gm-display text-xl font-semibold">Create your workspace</h2>
          <p className="gm-muted text-sm">
            A workspace holds one practice&rsquo;s data. Nobody outside it can see anything in it, and you
            decide who joins and what they may do.
          </p>
          <StartForm timezones={TIMEZONES} />
        </div>

        <div className="gm-card space-y-3">
          <h3 className="font-semibold">What this does, and does not do</h3>
          <ul className="gm-muted space-y-2 text-sm">
            <li>Reads CSV exports of appointments, invoices, payments, referrals, waitlists and tasks.</li>
            <li>Applies ten deterministic rules and explains every finding in plain language.</li>
            <li>Prioritises the work and tracks what was recovered.</li>
          </ul>
          <div className="gm-rule" />
          <ul className="gm-muted space-y-2 text-sm">
            <li>It never charges, refunds or writes anything off.</li>
            <li>It never connects to a bank.</li>
            <li>It never makes a clinical decision, and it does not need clinical notes.</li>
            <li>
              Where the data contradicts itself, it says HOLD rather than guessing — and a held finding can
              never contribute to a recovery claim.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
