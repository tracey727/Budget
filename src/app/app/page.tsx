import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { StatTile } from "@/components/app/StatTile";
import { EmptyState } from "@/components/app/EmptyState";
import {
  accountBalances,
  budgetProgress,
  listAccounts,
  listGoals,
  listTransactions,
  monthSummary,
  spendByCategory,
  upcomingBills,
} from "@/lib/data/queries";
import { formatMoney } from "@/lib/money";
import { toCents } from "@/lib/money";
import { formatDateAu, monthLabel, monthStart, todayIso, daysBetween } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayIso();
  const month = monthStart(today);

  const [summary, balances, accountList, budgets, spend, goals, bills, recent] =
    await Promise.all([
      monthSummary(user.id, month),
      accountBalances(user.id),
      listAccounts(user.id),
      budgetProgress(user.id, month),
      spendByCategory(user.id, month),
      listGoals(user.id),
      upcomingBills(user.id, 14),
      listTransactions(user.id, { limit: 8 }),
    ]);

  const netWorth = accountList.reduce(
    (total, account) => total + (balances.get(account.id) ?? 0),
    0,
  );

  const budgetedCents = budgets.reduce((t, b) => t + b.limitCents, 0);
  const budgetSpentCents = budgets.reduce((t, b) => t + b.spentCents, 0);
  const topSpend = spend.slice(0, 6);
  const maxSpend = topSpend[0]?.spentCents ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="gm-display text-3xl font-semibold">
            Good day, {user.fullName.split(" ")[0]}
          </h1>
          <p className="gm-muted mt-1 text-sm">{monthLabel(month)} at a glance</p>
        </div>
        <Link href="/app/transactions/new" className="gm-btn-primary">
          Add transaction
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Money in"
          value={formatMoney(summary.income)}
          hint="This month"
          tone="positive"
        />
        <StatTile
          label="Money out"
          value={formatMoney(summary.spend)}
          hint="This month"
          tone={summary.spend > 0 ? "negative" : "default"}
        />
        <StatTile
          label="Net this month"
          value={formatMoney(summary.net)}
          hint={summary.net >= 0 ? "You are ahead" : "Spending exceeds income"}
          tone={summary.net >= 0 ? "positive" : "negative"}
        />
        <StatTile
          label="Net position"
          value={formatMoney(netWorth)}
          hint={`Across ${accountList.length} account${accountList.length === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Budgets */}
        <section className="gm-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Budgets</h2>
            <Link href="/app/budgets" className="text-sm font-semibold text-brand-600 hover:underline">
              Manage
            </Link>
          </div>

          {budgets.length === 0 ? (
            <p className="gm-muted text-sm">
              No budgets set for {monthLabel(month)}.{" "}
              <Link href="/app/budgets" className="font-semibold text-brand-600 hover:underline">
                Set your first budget
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="gm-muted mb-4 text-sm">
                {formatMoney(budgetSpentCents)} of {formatMoney(budgetedCents)} used
              </p>
              <ul className="space-y-3.5">
                {budgets.slice(0, 6).map((budget) => {
                  const over = budget.spentCents > budget.limitCents;
                  return (
                    <li key={budget.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{budget.categoryName}</span>
                        <span className={over ? "font-semibold text-red-600 dark:text-red-400" : "gm-muted"}>
                          {formatMoney(budget.spentCents)} / {formatMoney(budget.limitCents)}
                        </span>
                      </div>
                      <div
                        className="gm-track h-2"
                        role="progressbar"
                        aria-valuenow={budget.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${budget.categoryName} budget used`}
                      >
                        <div
                          className={`${over ? "gm-fill-over" : "gm-fill-gold"}`}
                          style={{ width: `${Math.min(100, budget.percent)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Spending breakdown */}
        <section className="gm-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Where it went</h2>
            <Link href="/app/reports" className="text-sm font-semibold text-brand-600 hover:underline">
              Reports
            </Link>
          </div>

          {topSpend.length === 0 ? (
            <p className="gm-muted text-sm">No spending recorded this month yet.</p>
          ) : (
            <ul className="space-y-3">
              {topSpend.map((row) => (
                <li key={row.categoryId ?? row.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="gm-muted">{formatMoney(row.spentCents)}</span>
                  </div>
                  <div className="gm-track h-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${maxSpend > 0 ? Math.max(4, (row.spentCents / maxSpend) * 100) : 0}%`,
                        backgroundColor: row.colour,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming bills */}
        <section className="gm-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Due in the next fortnight</h2>
            <Link href="/app/bills" className="text-sm font-semibold text-brand-600 hover:underline">
              All bills
            </Link>
          </div>

          {bills.length === 0 ? (
            <p className="gm-muted text-sm">Nothing due in the next 14 days.</p>
          ) : (
            <ul className="space-y-2.5">
              {bills.slice(0, 6).map((row) => {
                const days = daysBetween(today, row.bill.nextDueOn);
                const overdue = days < 0;
                return (
                  <li key={row.bill.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.bill.name}</p>
                      <p className={`text-xs ${overdue ? "font-semibold text-red-600 dark:text-red-400" : "gm-muted"}`}>
                        {overdue
                          ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
                          : days === 0
                            ? "Due today"
                            : `In ${days} day${days === 1 ? "" : "s"} · ${formatDateAu(row.bill.nextDueOn)}`}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">
                      {formatMoney(toCents(row.bill.amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Goals */}
        <section className="gm-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Goals</h2>
            <Link href="/app/goals" className="text-sm font-semibold text-brand-600 hover:underline">
              Manage
            </Link>
          </div>

          {goals.length === 0 ? (
            <p className="gm-muted text-sm">
              No goals yet.{" "}
              <Link href="/app/goals" className="font-semibold text-brand-600 hover:underline">
                Set one
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3.5">
              {goals.slice(0, 4).map((goal) => {
                const target = toCents(goal.targetAmount);
                const saved = toCents(goal.savedAmount);
                const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                return (
                  <li key={goal.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{goal.name}</span>
                      <span className="gm-muted">
                        {formatMoney(saved)} / {formatMoney(target)}
                      </span>
                    </div>
                    <div
                      className="gm-track h-2"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.name} progress`}
                    >
                      <div className="gm-fill-gold" style={{ width: `${percent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Recent activity */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Recent activity</h2>
          <Link href="/app/transactions" className="text-sm font-semibold text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            body="Add your first transaction, or import a bank statement, to see where your money is going."
            actionHref="/app/transactions/new"
            actionLabel="Add a transaction"
          />
        ) : (
          <div className="gm-card gm-scroll-x p-0">
            <table className="gm-table min-w-[560px]">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Category</th>
                  <th scope="col">Account</th>
                  <th scope="col" className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => {
                  const cents = toCents(row.transaction.amount);
                  return (
                    <tr key={row.transaction.id}>
                      <td className="whitespace-nowrap">{formatDateAu(row.transaction.occurredOn)}</td>
                      <td className="font-medium">{row.transaction.description}</td>
                      <td>{row.categoryName ?? "Uncategorised"}</td>
                      <td className="gm-muted">{row.accountName}</td>
                      <td
                        className={`whitespace-nowrap text-right font-semibold ${
                          cents >= 0 ? "text-brand-600" : ""
                        }`}
                      >
                        {formatMoney(cents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
