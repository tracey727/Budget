import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import {
  cashflowSeries,
  gstSummary,
  monthSummary,
  spendByCategory,
} from "@/lib/data/queries";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { financialYear, monthLabel, monthStart, todayIso } from "@/lib/dates";
import { PaywallCard } from "@/components/app/PaywallCard";
import { StatTile } from "@/components/app/StatTile";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();

  if (!user.limits.reports) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black tracking-tight">Reports</h1>
        <PaywallCard
          title="Reports are part of Personal Premium"
          body="See 12 months of cash flow, category trends and your net position over time, plus a full CSV export of everything."
        />
      </div>
    );
  }

  const today = todayIso();
  const month = monthStart(today);
  const fy = financialYear(today);

  const [series, spend, summary, gst] = await Promise.all([
    cashflowSeries(user.id, 12),
    spendByCategory(user.id, month),
    monthSummary(user.id, month),
    user.limits.businessTools
      ? gstSummary(user.id, fy.start, fy.end)
      : Promise.resolve(null),
  ]);

  const maxBar = Math.max(
    1,
    ...series.map((s) => Math.max(s.incomeCents, s.spendCents)),
  );
  const totalSpend = spend.reduce((t, s) => t + s.spentCents, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Reports</h1>
        <Link href="/api/export/transactions" className="gm-btn-secondary">
          Export CSV
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Money in" value={formatMoney(summary.income)} hint={monthLabel(month)} tone="positive" />
        <StatTile label="Money out" value={formatMoney(summary.spend)} hint={monthLabel(month)} tone="negative" />
        <StatTile
          label="Net"
          value={formatMoney(summary.net)}
          hint={monthLabel(month)}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Cash flow */}
      <section className="gm-card">
        <h2 className="mb-1 font-bold">Cash flow</h2>
        <p className="gm-muted mb-5 text-sm">Money in and out over the last 12 months.</p>

        {series.length === 0 ? (
          <p className="gm-muted text-sm">Not enough data yet.</p>
        ) : (
          <>
            <div className="gm-scroll-x">
              <div className="flex min-w-[560px] items-end gap-3" style={{ height: 200 }}>
                {series.map((point) => (
                  <div key={point.month} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div
                        className="w-1/2 rounded-t bg-brand-500"
                        style={{ height: `${(point.incomeCents / maxBar) * 100}%` }}
                        title={`In: ${formatMoney(point.incomeCents)}`}
                      />
                      <div
                        className="w-1/2 rounded-t bg-ink-400 dark:bg-ink-600"
                        style={{ height: `${(point.spendCents / maxBar) * 100}%` }}
                        title={`Out: ${formatMoney(point.spendCents)}`}
                      />
                    </div>
                    <span className="gm-muted whitespace-nowrap text-[10px]">
                      {point.month.slice(5, 7)}/{point.month.slice(2, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-5 text-xs">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Money in
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-ink-400 dark:bg-ink-600" /> Money out
              </span>
            </div>
          </>
        )}
      </section>

      {/* Category breakdown */}
      <section className="gm-card">
        <h2 className="mb-1 font-bold">Spending by category</h2>
        <p className="gm-muted mb-5 text-sm">{monthLabel(month)}</p>

        {spend.length === 0 ? (
          <p className="gm-muted text-sm">No spending recorded this month.</p>
        ) : (
          <ul className="space-y-3">
            {spend.map((row) => {
              const share = totalSpend > 0 ? (row.spentCents / totalSpend) * 100 : 0;
              return (
                <li key={row.categoryId ?? row.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="gm-muted">
                      {formatMoney(row.spentCents)} · {share.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, share)}%`, backgroundColor: row.colour }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* GST / BAS — Professional only */}
      {user.limits.businessTools && gst && (
        <section className="gm-card">
          <h2 className="mb-1 font-bold">GST summary — {fy.label}</h2>
          <p className="gm-muted mb-5 text-sm">
            Australian financial year, 1 July {fy.start.slice(0, 4)} to 30 June {fy.end.slice(0, 4)}.
            Business transactions only.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Business income" value={formatMoneyCompact(gst.businessIncomeCents)} tone="positive" />
            <StatTile label="Business spend" value={formatMoneyCompact(gst.businessSpendCents)} />
            <StatTile label="GST collected" value={formatMoney(gst.collectedCents)} hint="On sales" />
            <StatTile label="GST paid" value={formatMoney(gst.paidCents)} hint="On purchases" />
          </div>

          <div className="mt-4 rounded-lg border border-[var(--gm-border)] p-4">
            <p className="text-sm">
              <span className="font-semibold">Net GST position:</span>{" "}
              <span className={gst.netCents >= 0 ? "font-bold" : "font-bold text-brand-600"}>
                {formatMoney(Math.abs(gst.netCents))}{" "}
                {gst.netCents >= 0 ? "payable to the ATO" : "refundable from the ATO"}
              </span>
            </p>
            <p className="gm-muted mt-2 text-xs leading-relaxed">
              This is a record-keeping summary based on the transactions you have
              tagged, not a lodged BAS or tax advice. Check the figures with your
              registered tax agent before lodging.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
