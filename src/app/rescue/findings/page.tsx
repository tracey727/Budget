import Link from "next/link";
import { requireTenant, tenantMembers } from "@/lib/rescue/tenant";
import { listFindings, type FindingFilters } from "@/lib/rescue/queries";
import { RULES } from "@/lib/rescue/rules";
import { parseAmountInput } from "@/lib/money";
import { FindingsTable } from "@/components/rescue/FindingsTable";
import type { PriorityBand } from "@/lib/rescue/types";

export const dynamic = "force-dynamic";

const BANDS: PriorityBand[] = ["red", "amber", "green", "hold"];

export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireTenant();
  const params = await searchParams;

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const bandParams = params.band
    ? (Array.isArray(params.band) ? params.band : [params.band]).filter((value): value is PriorityBand =>
        (BANDS as string[]).includes(value),
      )
    : [];

  const minValue = single("minValue");

  const filters: FindingFilters = {
    bands: bandParams.length > 0 ? bandParams : undefined,
    status: single("status") ?? "open",
    ruleId: single("rule") || undefined,
    assignee: single("assignee") || undefined,
    unassigned: single("unassigned") === "1",
    overdue: single("overdue") === "1",
    minValueCents: minValue ? (parseAmountInput(minValue) ?? undefined) : undefined,
    from: single("from") || undefined,
    to: single("to") || undefined,
    search: single("q") || undefined,
  };

  const [rows, members] = await Promise.all([
    listFindings(context.tenant.id, filters),
    tenantMembers(context.tenant.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-3xl font-semibold">Findings</h1>
        <p className="gm-muted mt-1 text-sm">
          Everything the rules have found, with the money each one represents and what it is based on.
        </p>
      </div>

      <form className="gm-card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="gm-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={filters.search ?? ""} className="gm-input" placeholder="Invoice or reference" />
        </div>

        <div>
          <label className="gm-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status} className="gm-input">
            <option value="open">Open</option>
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="reviewing">Being reviewed</option>
            <option value="actioned">Actioned</option>
            <option value="hold">On hold</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <div>
          <label className="gm-label" htmlFor="rule">
            Rule
          </label>
          <select id="rule" name="rule" defaultValue={filters.ruleId ?? ""} className="gm-input">
            <option value="">Every rule</option>
            {RULES.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.id} — {rule.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="gm-label" htmlFor="assignee">
            Owner
          </label>
          <select id="assignee" name="assignee" defaultValue={filters.assignee ?? ""} className="gm-input">
            <option value="">Anyone</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="gm-label">Priority</legend>
          <div className="flex flex-wrap gap-3">
            {BANDS.map((band) => (
              <label key={band} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="band" value={band} defaultChecked={bandParams.includes(band)} />
                {band.toUpperCase()}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="unassigned" value="1" defaultChecked={filters.unassigned} />
              Unassigned
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="overdue" value="1" defaultChecked={filters.overdue} />
              Overdue
            </label>
          </div>
        </fieldset>

        <div>
          <label className="gm-label" htmlFor="minValue">
            Minimum value
          </label>
          <input id="minValue" name="minValue" defaultValue={minValue ?? ""} className="gm-input" placeholder="250.00" />
        </div>

        <div className="flex items-end gap-3">
          <button type="submit" className="gm-btn-primary">
            Apply
          </button>
          <Link href="/rescue/findings" className="gm-btn-secondary">
            Clear
          </Link>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className="gm-muted text-sm">
          {rows.length} finding{rows.length === 1 ? "" : "s"}
          {rows.length === 200 && " (first 200)"}
        </p>
        {context.can("export") && (
          <Link
            href="/api/rescue/exports/findings"
            prefetch={false}
            className="gm-muted text-sm hover:text-brand-600"
          >
            Export as CSV →
          </Link>
        )}
      </div>

      <FindingsTable
        rows={rows}
        timeZone={context.tenant.timezone}
        emptyMessage="No findings match those filters. If detection has not run since your last import, run it from the dashboard."
      />
    </div>
  );
}
