import Link from "next/link";
import { requireTenant } from "@/lib/rescue/tenant";
import {
  dashboardSummary,
  hasOperationalData,
  lastRuleRun,
  listFindings,
  openFindingsByRule,
  recoveryTrend,
} from "@/lib/rescue/queries";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatInstant } from "@/lib/rescue/time";
import { BandBadge, ValueWithBasis } from "@/components/rescue/Band";
import { asBand, asValueBasis, centsOf } from "@/lib/rescue/types";
import { RunDetection } from "./RunDetection";
import { SeedDemo } from "./SeedDemo";

export const dynamic = "force-dynamic";

function Tile({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div className="gm-card">
      <p className="gm-muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className={`mt-1.5 text-2xl font-black ${emphasis ? "text-brand-600" : ""}`}>{value}</p>
      <p className="gm-muted mt-1 text-xs">{hint}</p>
    </div>
  );
}

export default async function RescueDashboard() {
  const context = await requireTenant();
  const tenantId = context.tenant.id;

  const [summary, trend, byRule, top, run, hasData] = await Promise.all([
    dashboardSummary(tenantId),
    recoveryTrend(tenantId),
    openFindingsByRule(tenantId),
    listFindings(tenantId, { status: "open", bands: ["red", "amber"] }, 5),
    lastRuleRun(tenantId),
    hasOperationalData(tenantId),
  ]);

  const peak = Math.max(1, ...trend.map((point) => Math.abs(point.cents)));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="gm-display text-3xl font-semibold">{context.tenant.name}</h1>
          <p className="gm-muted mt-1 text-sm">
            {run
              ? `Detection last ran ${formatInstant(run.startedAt, context.tenant.timezone)} — ${run.findingsCreated} new, ${run.findingsUpdated} updated, ${run.findingsResolved} resolved.`
              : "Detection has not been run yet."}
          </p>
        </div>
        {context.can("run_rules") && <RunDetection />}
      </div>

      {!hasData && (
        <div className="gm-card space-y-3">
          <h2 className="font-semibold">Nothing to look at yet</h2>
          <p className="gm-muted text-sm">
            Upload an export from your practice system, or load the synthetic demonstration data to see the
            whole journey end to end.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/rescue/imports" className="gm-btn-primary">
              Go to the Import Centre
            </Link>
            {context.can("import") && <SeedDemo />}
          </div>
        </div>
      )}

      <section aria-labelledby="headline">
        <h2 id="headline" className="sr-only">
          Headline figures
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Tile
            label="Value at risk"
            value={formatMoneyCompact(summary.valueAtRiskCents)}
            hint="Open findings, service value and unpaid balances only."
          />
          <Tile
            label="Confirmed recovered"
            value={formatMoneyCompact(summary.confirmedRecoveredCents)}
            hint="Posted by a person against evidence."
            emphasis
          />
          <Tile
            label="Being worked"
            value={formatMoneyCompact(summary.outstandingActionCents)}
            hint="Value on findings someone has picked up."
          />
          <Tile label="Red actions" value={String(summary.redCount)} hint="Highest priority, still open." />
          <Tile label="On hold" value={String(summary.holdCount)} hint="Source data needs correcting." />
        </div>
      </section>

      {(summary.unmatchedFundsCents > 0 || summary.potentialValueCents > 0 || summary.duplicateValueCents > 0) && (
        <section className="gm-card">
          <h2 className="font-semibold">Counted separately, on purpose</h2>
          <p className="gm-muted mt-1 text-sm">
            These are real numbers, but none of them is money at risk, so adding them to the headline would
            overstate it.
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="gm-muted text-xs uppercase tracking-wide">Unmatched funds</dt>
              <dd className="text-lg font-semibold">{formatMoney(summary.unmatchedFundsCents)}</dd>
              <p className="gm-muted text-xs">Already received, not yet allocated to an invoice.</p>
            </div>
            <div>
              <dt className="gm-muted text-xs uppercase tracking-wide">Potential value</dt>
              <dd className="text-lg font-semibold">{formatMoney(summary.potentialValueCents)}</dd>
              <p className="gm-muted text-xs">Waitlist opportunities. Never treated as a receivable.</p>
            </div>
            <div>
              <dt className="gm-muted text-xs uppercase tracking-wide">Possible over-billing</dt>
              <dd className="text-lg font-semibold">{formatMoney(summary.duplicateValueCents)}</dd>
              <p className="gm-muted text-xs">Duplicate candidates for a person to check.</p>
            </div>
          </dl>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="gm-card">
          <h2 className="font-semibold">Recovery over time</h2>
          {trend.length === 0 ? (
            <p className="gm-muted mt-2 text-sm">
              Nothing recorded yet. Recovery appears here the moment someone confirms it against a finding.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {trend.map((point) => (
                <li key={point.month} className="flex items-center gap-3">
                  <span className="gm-muted w-20 shrink-0 text-xs">{point.month}</span>
                  <span className="h-2 flex-1 rounded-full bg-[rgba(246,239,227,0.08)]">
                    <span
                      className="rr-bar block"
                      style={{ width: `${Math.max(2, (Math.abs(point.cents) / peak) * 100)}%` }}
                    />
                  </span>
                  <span className="w-24 shrink-0 text-right text-sm font-semibold">
                    {formatMoney(point.cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="gm-muted mt-4 text-xs">
            Every figure here is the sum of confirmed recovery events, including reversals. It reconciles to
            the recovery history on each finding.
          </p>
        </section>

        <section className="gm-card">
          <h2 className="font-semibold">Open findings by rule</h2>
          {byRule.length === 0 ? (
            <p className="gm-muted mt-2 text-sm">No open findings.</p>
          ) : (
            <table className="gm-table mt-3">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th className="text-right">Open</th>
                  <th className="text-right">Value at risk</th>
                </tr>
              </thead>
              <tbody>
                {byRule.map((row) => (
                  <tr key={row.ruleId}>
                    <td>
                      <Link href={`/rescue/findings?rule=${row.ruleId}`} className="hover:text-brand-600">
                        <span className="gm-muted mr-2 text-xs">{row.ruleId}</span>
                        {row.ruleName}
                      </Link>
                    </td>
                    <td className="text-right">{row.count}</td>
                    <td className="text-right">{row.cents > 0 ? formatMoney(row.cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="gm-card">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Top outstanding actions</h2>
          <Link href="/rescue/queue" className="gm-muted text-sm hover:text-brand-600">
            Open the queue →
          </Link>
        </div>

        {top.length === 0 ? (
          <p className="gm-muted mt-2 text-sm">Nothing red or amber is open. That is the point of the tool.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {top.map((row) => (
              <li key={row.finding.id} className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/rescue/findings/${row.finding.id}`} className="font-medium hover:text-brand-600">
                    {row.finding.title}
                  </Link>
                  <p className="gm-muted mt-0.5 text-xs">
                    {row.finding.ruleId} · {row.action?.assigneeName ?? "Unassigned"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ValueWithBasis
                    cents={centsOf(row.finding.estimatedValue)}
                    basis={asValueBasis(row.finding.valueBasis)}
                    className="text-sm"
                  />
                  <BandBadge band={asBand(row.finding.priorityBand)} score={row.finding.priorityScore} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {summary.unassignedCount > 0 || summary.overdueActionCount > 0 ? (
        <p className="gm-alert-warn text-sm">
          {summary.overdueActionCount > 0 && `${summary.overdueActionCount} action${summary.overdueActionCount === 1 ? " is" : "s are"} past their due date. `}
          {summary.unassignedCount > 0 && `${summary.unassignedCount} open finding${summary.unassignedCount === 1 ? " has" : "s have"} nobody assigned.`}
        </p>
      ) : null}
    </div>
  );
}
