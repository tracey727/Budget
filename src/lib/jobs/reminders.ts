/**
 * The scheduled checks that do not need a bank.
 *
 * Bills falling due, budgets running out and goals reached are all things a
 * person should be told about without having to open the app and work it out.
 * Each check raises alerts with a dedupe key tied to the thing itself, so
 * running the job every hour produces one reminder, not twenty-four.
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { budgets, categories, goals, recurringBills, transactions } from "@/lib/db/schema";
import { raiseAlerts, type NewAlert } from "@/lib/alerts";
import { formatMoney, toCents } from "@/lib/money";
import { addDays, daysBetween, monthStart, todayIso } from "@/lib/dates";

/** Bills are flagged this far ahead — enough notice to move money. */
const BILL_HORIZON_DAYS = 5;
/** Budgets are flagged once spending passes this share of the limit. */
const BUDGET_WARNING_RATIO = 0.85;

export type ReminderSummary = {
  billsFlagged: number;
  budgetsFlagged: number;
  goalsReached: number;
};

/**
 * Runs every check for every person who has something due.
 *
 * The queries are deliberately driven from the due rows rather than from the
 * user table: the work is then proportional to what is actually happening,
 * not to how many accounts exist.
 */
export async function runBillChecks(): Promise<ReminderSummary> {
  const today = todayIso();
  const horizon = addDays(today, BILL_HORIZON_DAYS);

  const summary: ReminderSummary = {
    billsFlagged: 0,
    budgetsFlagged: 0,
    goalsReached: 0,
  };

  /* ------------------------------- bills -------------------------------- */

  const due = await db()
    .select({ bill: recurringBills, categoryName: categories.name })
    .from(recurringBills)
    .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
    .where(
      and(
        eq(recurringBills.archived, false),
        gte(recurringBills.nextDueOn, addDays(today, -14)),
        lte(recurringBills.nextDueOn, horizon),
      ),
    );

  const byUser = new Map<string, NewAlert[]>();
  const push = (userId: string, alert: NewAlert) => {
    const list = byUser.get(userId) ?? [];
    list.push(alert);
    byUser.set(userId, list);
  };

  for (const row of due) {
    const days = daysBetween(today, row.bill.nextDueOn);
    const amount = toCents(row.bill.amount);
    const overdue = days < 0;

    push(row.bill.userId, {
      kind: "bill_due",
      severity: overdue ? "warning" : "info",
      title: overdue
        ? `${row.bill.name} is ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
        : days === 0
          ? `${row.bill.name} is due today`
          : `${row.bill.name} is due in ${days} day${days === 1 ? "" : "s"}`,
      body: `${formatMoney(amount)}${row.categoryName ? ` · ${row.categoryName}` : ""}. Mark it paid when it leaves your account and the next due date moves forward automatically.`,
      href: "/app/bills",
      amountCents: -Math.abs(amount),
      // Keyed to the due date, so the same bill raises one alert per cycle.
      dedupeKey: `bill:${row.bill.id}:${row.bill.nextDueOn}`,
    });
    summary.billsFlagged += 1;
  }

  /* ------------------------------ budgets ------------------------------- */

  const month = monthStart(today);
  const budgetRows = await db()
    .select({
      budget: budgets,
      categoryName: categories.name,
      spent: sql<string>`coalesce((
        select sum(-${transactions.amount}) from ${transactions}
        where ${transactions.userId} = ${budgets.userId}
          and ${transactions.categoryId} = ${budgets.categoryId}
          and ${transactions.occurredOn} >= ${budgets.periodStart}
          and ${transactions.occurredOn} < (${budgets.periodStart}::date + interval '1 month')
          and ${transactions.amount} < 0
          and ${transactions.status} <> 'declined'
      ), 0)`,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(eq(budgets.periodStart, month));

  for (const row of budgetRows) {
    const limit = toCents(row.budget.limitAmount);
    if (limit <= 0) continue;
    const spent = toCents(row.spent);
    const ratio = spent / limit;
    if (ratio < BUDGET_WARNING_RATIO) continue;

    const exceeded = spent > limit;
    push(row.budget.userId, {
      kind: exceeded ? "budget_exceeded" : "budget_warning",
      severity: exceeded ? "warning" : "info",
      title: exceeded
        ? `${row.categoryName} is over budget by ${formatMoney(spent - limit)}`
        : `${row.categoryName} is at ${Math.round(ratio * 100)}% of budget`,
      body: `${formatMoney(spent)} of ${formatMoney(limit)} spent this month. Pending transactions are included, because that money is already committed.`,
      href: "/app/budgets",
      amountCents: -(spent),
      // One warning and one over-budget alert per category per month.
      dedupeKey: `budget:${row.budget.id}:${exceeded ? "over" : "warn"}`,
    });
    summary.budgetsFlagged += 1;
  }

  /* ------------------------------- goals -------------------------------- */

  const reached = await db()
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.archived, false),
        sql`${goals.savedAmount} >= ${goals.targetAmount}`,
      ),
    );

  for (const goal of reached) {
    push(goal.userId, {
      kind: "goal_reached",
      severity: "info",
      title: `${goal.name} is fully funded`,
      body: `You have reached ${formatMoney(toCents(goal.targetAmount))}. Time to decide what it is for.`,
      href: "/app/goals",
      amountCents: toCents(goal.savedAmount),
      dedupeKey: `goal:${goal.id}:reached`,
    });
    summary.goalsReached += 1;
  }

  for (const [userId, alerts] of byUser) {
    await raiseAlerts(userId, alerts);
  }

  return summary;
}
