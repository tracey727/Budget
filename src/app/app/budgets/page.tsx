import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { budgetProgress, listCategories } from "@/lib/data/queries";
import { deleteBudgetAction } from "@/lib/actions/budgets";
import { BudgetForm } from "./BudgetForm";
import { formatMoney } from "@/lib/money";
import { monthLabel, monthStart, todayIso, addMonths } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const month = monthStart(
    /^\d{4}-\d{2}-\d{2}$/.test(params.month ?? "") ? params.month! : todayIso(),
  );

  const [budgets, categories] = await Promise.all([
    budgetProgress(user.id, month),
    listCategories(user.id),
  ]);

  const totalLimit = budgets.reduce((t, b) => t + b.limitCents, 0);
  const totalSpent = budgets.reduce((t, b) => t + b.spentCents, 0);

  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Budgets</h1>
        <div className="flex items-center gap-2">
          <Link href={`/app/budgets?month=${prev}`} className="gm-btn-secondary py-1.5 text-xs">
            ← {monthLabel(prev)}
          </Link>
          <span className="px-1 text-sm font-bold">{monthLabel(month)}</span>
          <Link href={`/app/budgets?month=${next}`} className="gm-btn-secondary py-1.5 text-xs">
            {monthLabel(next)} →
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {budgets.length === 0 ? (
            <div className="gm-card">
              <p className="gm-muted text-sm">
                No budgets set for {monthLabel(month)}. Add one on the right.
              </p>
            </div>
          ) : (
            <>
              <div className="gm-card">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-bold">All budgets</span>
                  <span className="gm-muted">
                    {formatMoney(totalSpent)} of {formatMoney(totalLimit)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                  <div
                    className={`h-full rounded-full ${totalSpent > totalLimit ? "bg-red-500" : "bg-brand-500"}`}
                    style={{
                      width: `${totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="gm-muted mt-2 text-xs">
                  {totalLimit - totalSpent >= 0
                    ? `${formatMoney(totalLimit - totalSpent)} left to spend`
                    : `${formatMoney(totalSpent - totalLimit)} over budget`}
                </p>
              </div>

              {budgets.map((budget) => {
                const over = budget.spentCents > budget.limitCents;
                return (
                  <div key={budget.id} className="gm-card">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: budget.categoryColour }}
                        />
                        <h2 className="font-bold">{budget.categoryName}</h2>
                      </div>
                      <form action={deleteBudgetAction}>
                        <input type="hidden" name="id" value={budget.id} />
                        <button
                          type="submit"
                          className="gm-muted text-xs hover:text-red-600"
                          aria-label={`Remove ${budget.categoryName} budget`}
                        >
                          Remove
                        </button>
                      </form>
                    </div>

                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
                      role="progressbar"
                      aria-valuenow={budget.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${budget.categoryName} budget used`}
                    >
                      <div
                        className={`h-full rounded-full ${over ? "bg-red-500" : "bg-brand-500"}`}
                        style={{ width: `${Math.min(100, budget.percent)}%` }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-sm">
                      <span className="gm-muted">
                        {formatMoney(budget.spentCents)} of {formatMoney(budget.limitCents)}
                      </span>
                      <span className={over ? "font-semibold text-red-600 dark:text-red-400" : "gm-muted"}>
                        {over
                          ? `${formatMoney(-budget.remainingCents)} over`
                          : `${formatMoney(budget.remainingCents)} left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="gm-card h-fit">
          <h2 className="mb-4 font-bold">Set a budget</h2>
          <BudgetForm
            month={month}
            categories={categories
              .filter((c) => c.kind === "expense")
              .map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      </div>
    </div>
  );
}
