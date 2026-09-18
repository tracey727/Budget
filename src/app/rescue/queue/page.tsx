import Link from "next/link";
import { requireTenant } from "@/lib/rescue/tenant";
import { listFindings } from "@/lib/rescue/queries";
import { FindingsTable } from "@/components/rescue/FindingsTable";

export const dynamic = "force-dynamic";

/**
 * The action queue, arranged for the manager who has ten minutes.
 *
 * Exceptions first: overdue work, then unassigned money, then held data. A
 * queue that opens on everything is a queue nobody works.
 */
export default async function QueuePage() {
  const context = await requireTenant();
  const tenantId = context.tenant.id;

  const [overdue, unassigned, held, rest] = await Promise.all([
    listFindings(tenantId, { status: "open", overdue: true, bands: ["red", "amber"] }, 50),
    listFindings(tenantId, { status: "open", unassigned: true, bands: ["red", "amber"] }, 50),
    listFindings(tenantId, { status: "open", bands: ["hold"] }, 50),
    listFindings(tenantId, { status: "open", bands: ["red", "amber", "green"] }, 100),
  ]);

  const flagged = new Set([...overdue, ...unassigned].map((row) => row.finding.id));
  const remainder = rest.filter((row) => !flagged.has(row.finding.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="gm-display text-3xl font-semibold">Action queue</h1>
        <p className="gm-muted mt-1 text-sm">
          Exceptions first. Everything on this page is open work — assign it, do it, or say why it does not
          need doing.
        </p>
      </div>

      <section>
        <h2 className="gm-display text-xl font-semibold">Overdue</h2>
        <p className="gm-muted mt-1 text-sm">Red and amber findings whose due date has passed.</p>
        <div className="mt-3">
          <FindingsTable rows={overdue} timeZone={context.tenant.timezone} emptyMessage="Nothing is overdue." />
        </div>
      </section>

      <section>
        <h2 className="gm-display text-xl font-semibold">Unassigned</h2>
        <p className="gm-muted mt-1 text-sm">High-priority findings with nobody&rsquo;s name on them.</p>
        <div className="mt-3">
          <FindingsTable
            rows={unassigned}
            timeZone={context.tenant.timezone}
            emptyMessage="Everything red or amber has an owner."
          />
        </div>
      </section>

      <section>
        <h2 className="gm-display text-xl font-semibold">Held for data correction</h2>
        <p className="gm-muted mt-1 text-sm">
          These are not leakage. They are records that contradict themselves, and they cannot contribute to
          any recovery figure until the source data is fixed.
        </p>
        <div className="mt-3">
          <FindingsTable
            rows={held}
            timeZone={context.tenant.timezone}
            emptyMessage="Nothing is on hold. The imported data is internally consistent."
          />
        </div>
      </section>

      <section>
        <h2 className="gm-display text-xl font-semibold">Everything else open</h2>
        <div className="mt-3">
          <FindingsTable rows={remainder} timeZone={context.tenant.timezone} emptyMessage="Nothing else is open." />
        </div>
        <p className="gm-muted mt-3 text-sm">
          <Link href="/rescue/findings" className="hover:text-brand-600">
            Open the full findings table with filters →
          </Link>
        </p>
      </section>
    </div>
  );
}
