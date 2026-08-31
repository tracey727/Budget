import { requireUser } from "@/lib/auth/require";
import { listAccounts, listCategories, listRecurringBills } from "@/lib/data/queries";
import { archiveBillAction, markBillPaidAction } from "@/lib/actions/bills";
import { FREQUENCY_LABELS } from "@/lib/labels";
import { BillForm } from "./BillForm";
import { formatMoney, toCents } from "@/lib/money";
import { formatDateAu, todayIso, daysBetween } from "@/lib/dates";
import { PaywallCard } from "@/components/app/PaywallCard";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const user = await requireUser();

  if (!user.limits.reports) {
    return (
      <div className="space-y-6">
        <h1 className="gm-display text-3xl font-semibold">Bills</h1>
        <PaywallCard
          title="Recurring bills are part of Personal Premium"
          body="Track weekly, fortnightly, monthly, quarterly and annual bills, and see everything due in the next fortnight before it lands."
        />
      </div>
    );
  }

  const [bills, categories, accounts] = await Promise.all([
    listRecurringBills(user.id),
    listCategories(user.id),
    listAccounts(user.id),
  ]);

  const today = todayIso();

  // Normalise every frequency to a monthly figure so the total is comparable.
  const MONTHLY_FACTOR: Record<string, number> = {
    weekly: 52 / 12,
    fortnightly: 26 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
  };

  const monthlyTotal = bills.reduce(
    (sum, row) =>
      sum + toCents(row.bill.amount) * (MONTHLY_FACTOR[row.bill.frequency] ?? 1),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="gm-display text-3xl font-semibold">Bills</h1>
        <p className="gm-muted text-sm">
          About{" "}
          <span className="font-bold text-[var(--gm-text)]">
            {formatMoney(Math.round(monthlyTotal))}
          </span>{" "}
          a month
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {bills.length === 0 ? (
            <div className="gm-card">
              <p className="gm-muted text-sm">No bills tracked yet. Add one on the right.</p>
            </div>
          ) : (
            bills.map((row) => {
              const days = daysBetween(today, row.bill.nextDueOn);
              const overdue = days < 0;
              const soon = days >= 0 && days <= 7;

              return (
                <div key={row.bill.id} className="gm-card flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{row.bill.name}</h2>
                    <p className="gm-muted text-xs">
                      {FREQUENCY_LABELS[row.bill.frequency as keyof typeof FREQUENCY_LABELS] ?? row.bill.frequency}
                      {row.categoryName ? ` · ${row.categoryName}` : ""}
                      {row.accountName ? ` · ${row.accountName}` : ""}
                      {row.bill.autoPay ? " · Auto-pay" : ""}
                    </p>
                    <p
                      className={`mt-0.5 text-xs font-semibold ${
                        overdue
                          ? "text-red-600 dark:text-red-400"
                          : soon
                            ? "text-amber-600 dark:text-amber-400"
                            : "gm-muted"
                      }`}
                    >
                      {overdue
                        ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
                        : days === 0
                          ? "Due today"
                          : `Due ${formatDateAu(row.bill.nextDueOn)} · in ${days} day${days === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="gm-display text-lg font-semibold">{formatMoney(toCents(row.bill.amount))}</span>
                    <form action={markBillPaidAction}>
                      <input type="hidden" name="id" value={row.bill.id} />
                      <button type="submit" className="gm-btn-secondary py-1.5 text-xs">
                        Mark paid
                      </button>
                    </form>
                    <form action={archiveBillAction}>
                      <input type="hidden" name="id" value={row.bill.id} />
                      <button
                        type="submit"
                        className="gm-muted text-xs hover:text-red-600"
                        aria-label={`Archive ${row.bill.name}`}
                      >
                        Archive
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="gm-card h-fit">
          <h2 className="mb-4 font-bold">Track a bill</h2>
          <BillForm
            categories={categories
              .filter((c) => c.kind === "expense")
              .map((c) => ({ id: c.id, name: c.name }))}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          />
        </div>
      </div>
    </div>
  );
}
