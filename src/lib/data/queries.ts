import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  budgets,
  categories,
  goals,
  recurringBills,
  transactions,
  trips,
} from "@/lib/db/schema";
import { toCents } from "@/lib/money";
import { monthStart, nextMonthStart, todayIso, addDays } from "@/lib/dates";

export async function listAccounts(userId: string, includeArchived = false) {
  const rows = await db()
    .select()
    .from(accounts)
    .where(
      includeArchived
        ? eq(accounts.userId, userId)
        : and(eq(accounts.userId, userId), eq(accounts.archived, false)),
    )
    .orderBy(asc(accounts.name));
  return rows;
}

export async function listCategories(userId: string) {
  return db()
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.archived, false)))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/** Current balance per account = opening balance + sum of its transactions. */
export async function accountBalances(
  userId: string,
): Promise<Map<string, number>> {
  const rows = await db()
    .select({
      accountId: transactions.accountId,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.accountId);

  const sums = new Map<string, number>();
  for (const row of rows) sums.set(row.accountId, toCents(row.total));

  const list = await listAccounts(userId, true);
  const balances = new Map<string, number>();
  for (const account of list) {
    balances.set(
      account.id,
      toCents(account.openingBalance) + (sums.get(account.id) ?? 0),
    );
  }
  return balances;
}

export type TransactionFilter = {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  tripId?: string;
  businessOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function listTransactions(
  userId: string,
  filter: TransactionFilter = {},
) {
  const conditions = [eq(transactions.userId, userId)];
  if (filter.from) conditions.push(gte(transactions.occurredOn, filter.from));
  if (filter.to) conditions.push(lte(transactions.occurredOn, filter.to));
  if (filter.accountId) conditions.push(eq(transactions.accountId, filter.accountId));
  if (filter.categoryId) conditions.push(eq(transactions.categoryId, filter.categoryId));
  if (filter.tripId) conditions.push(eq(transactions.tripId, filter.tripId));
  if (filter.businessOnly) conditions.push(eq(transactions.isBusiness, true));

  return db()
    .select({
      transaction: transactions,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryColour: categories.colour,
      tripName: trips.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(trips, eq(transactions.tripId, trips.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
    .limit(filter.limit ?? 100)
    .offset(filter.offset ?? 0);
}

export async function countTransactions(userId: string): Promise<number> {
  const rows = await db()
    .select({ count: sql<string>`count(*)` })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  return Number(rows[0]?.count ?? 0);
}

/** Income, spend and net for a single month, in cents. */
export async function monthSummary(userId: string, month: string) {
  const start = monthStart(month);
  const end = nextMonthStart(start);

  const rows = await db()
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      spend: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, start),
        sql`${transactions.occurredOn} < ${end}`,
      ),
    );

  const income = toCents(rows[0]?.income ?? "0");
  const spend = Math.abs(toCents(rows[0]?.spend ?? "0"));
  return { income, spend, net: income - spend };
}

/** Spend by category for a month, in cents, largest first. */
export async function spendByCategory(userId: string, month: string) {
  const start = monthStart(month);
  const end = nextMonthStart(start);

  const rows = await db()
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      colour: categories.colour,
      total: sql<string>`coalesce(sum(-${transactions.amount}), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, start),
        sql`${transactions.occurredOn} < ${end}`,
        sql`${transactions.amount} < 0`,
      ),
    )
    .groupBy(transactions.categoryId, categories.name, categories.colour)
    .orderBy(desc(sql`sum(-${transactions.amount})`));

  return rows.map((row) => ({
    categoryId: row.categoryId,
    name: row.name ?? "Uncategorised",
    colour: row.colour ?? "#94a3b8",
    spentCents: toCents(row.total),
  }));
}

/** Budgets for a month joined with actual spend against each category. */
export async function budgetProgress(userId: string, month: string) {
  const start = monthStart(month);
  const rows = await db()
    .select({
      budget: budgets,
      categoryName: categories.name,
      categoryColour: categories.colour,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(eq(budgets.userId, userId), eq(budgets.periodStart, start)))
    .orderBy(asc(categories.name));

  if (rows.length === 0) return [];

  const spend = await spendByCategory(userId, month);
  const spentByCategory = new Map(spend.map((s) => [s.categoryId, s.spentCents]));

  return rows.map((row) => {
    const limitCents = toCents(row.budget.limitAmount);
    const spentCents = spentByCategory.get(row.budget.categoryId) ?? 0;
    return {
      id: row.budget.id,
      categoryId: row.budget.categoryId,
      categoryName: row.categoryName,
      categoryColour: row.categoryColour,
      limitCents,
      spentCents,
      remainingCents: limitCents - spentCents,
      percent: limitCents > 0 ? Math.min(999, Math.round((spentCents / limitCents) * 100)) : 0,
    };
  });
}

export async function listGoals(userId: string) {
  return db()
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.archived, false)))
    .orderBy(asc(goals.targetDate), asc(goals.name));
}

export async function listRecurringBills(userId: string) {
  return db()
    .select({
      bill: recurringBills,
      categoryName: categories.name,
      accountName: accounts.name,
    })
    .from(recurringBills)
    .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
    .leftJoin(accounts, eq(recurringBills.accountId, accounts.id))
    .where(
      and(eq(recurringBills.userId, userId), eq(recurringBills.archived, false)),
    )
    .orderBy(asc(recurringBills.nextDueOn));
}

/** Bills due within `days` — drives the dashboard "coming up" panel. */
export async function upcomingBills(userId: string, days = 14) {
  const today = todayIso();
  const horizon = addDays(today, days);
  return db()
    .select({ bill: recurringBills, categoryName: categories.name })
    .from(recurringBills)
    .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
    .where(
      and(
        eq(recurringBills.userId, userId),
        eq(recurringBills.archived, false),
        lte(recurringBills.nextDueOn, horizon),
      ),
    )
    .orderBy(asc(recurringBills.nextDueOn));
}

/** Monthly income/spend series for the trailing `months` months. */
export async function cashflowSeries(userId: string, months = 12) {
  const rows = await db()
    .select({
      month: sql<string>`to_char(date_trunc('month', ${transactions.occurredOn}), 'YYYY-MM-DD')`,
      income: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      spend: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(sql`date_trunc('month', ${transactions.occurredOn})`)
    .orderBy(desc(sql`date_trunc('month', ${transactions.occurredOn})`))
    .limit(months);

  return rows
    .map((row) => ({
      month: row.month,
      incomeCents: toCents(row.income),
      spendCents: toCents(row.spend),
    }))
    .reverse();
}

/** GST collected and paid over a period — the Professional-tier BAS helper. */
export async function gstSummary(userId: string, from: string, to: string) {
  const rows = await db()
    .select({
      collected: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.gstAmount} else 0 end), 0)`,
      paid: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then ${transactions.gstAmount} else 0 end), 0)`,
      businessIncome: sql<string>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      businessSpend: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isBusiness, true),
        gte(transactions.occurredOn, from),
        lte(transactions.occurredOn, to),
      ),
    );

  const row = rows[0];
  const collected = toCents(row?.collected ?? "0");
  const paid = Math.abs(toCents(row?.paid ?? "0"));
  return {
    collectedCents: collected,
    paidCents: paid,
    netCents: collected - paid,
    businessIncomeCents: toCents(row?.businessIncome ?? "0"),
    businessSpendCents: toCents(row?.businessSpend ?? "0"),
  };
}

export async function ownsAccount(userId: string, accountId: string) {
  const rows = await db()
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function categoryIdsFor(userId: string, ids: string[]) {
  if (ids.length === 0) return new Set<string>();
  const rows = await db()
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));
  return new Set(rows.map((r) => r.id));
}

/* -------------------------------------------------------------------------- */
/*                                   Trips                                    */
/* -------------------------------------------------------------------------- */

export async function listTrips(userId: string, includeArchived = false) {
  return db()
    .select()
    .from(trips)
    .where(
      includeArchived
        ? eq(trips.userId, userId)
        : and(eq(trips.userId, userId), eq(trips.archived, false)),
    )
    .orderBy(desc(trips.startsOn), asc(trips.name));
}

export async function getTrip(userId: string, tripId: string) {
  const rows = await db()
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export type TripSpend = {
  spentCents: number;
  fuelCents: number;
  transactionCount: number;
};

/** Total spend against a trip, plus the fuel share, in cents. */
export async function tripSpend(
  userId: string,
  tripId: string,
): Promise<TripSpend> {
  const rows = await db()
    .select({
      spent: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
      fuel: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 and ${categories.name} ilike '%fuel%' then -${transactions.amount} else 0 end), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.tripId, tripId)));

  const row = rows[0];
  return {
    spentCents: toCents(row?.spent ?? "0"),
    fuelCents: toCents(row?.fuel ?? "0"),
    transactionCount: Number(row?.count ?? 0),
  };
}

/** Spend for many trips at once, so the list page needs a single query. */
export async function tripSpendMap(userId: string): Promise<Map<string, number>> {
  const rows = await db()
    .select({
      tripId: transactions.tripId,
      spent: sql<string>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNotNull(transactions.tripId)))
    .groupBy(transactions.tripId);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.tripId) map.set(row.tripId, toCents(row.spent));
  }
  return map;
}

/** The trip currently under way, if any — drives the dashboard panel. */
export async function activeTrip(userId: string) {
  const today = todayIso();
  const rows = await db()
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId),
        eq(trips.archived, false),
        lte(trips.startsOn, today),
        gte(trips.endsOn, today),
      ),
    )
    .orderBy(desc(trips.startsOn))
    .limit(1);
  return rows[0] ?? null;
}

export async function ownsTrip(userId: string, tripId: string) {
  const rows = await db()
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);
  return rows.length > 0;
}
