import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  bankConnections,
  budgets,
  categories,
  goals,
  recurringBills,
  transactions,
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

/**
 * What an account is actually worth, split three ways.
 *
 * `cleared`   money the bank has settled. This is the figure on a statement.
 * `pending`   authorisations the bank has made but not settled. Usually
 *             negative, because most pending items are card purchases.
 * `available` cleared + pending — what is genuinely safe to spend.
 *
 * Declined authorisations, which the bank released without settling, count
 * towards none of the three but stay visible in the transaction list.
 */
export type AccountBalance = {
  clearedCents: number;
  pendingCents: number;
  availableCents: number;
  pendingCount: number;
  /** What the bank itself last reported, when the account is linked. */
  bankLedgerCents: number | null;
  bankAvailableCents: number | null;
  balanceUpdatedAt: Date | null;
  isLinked: boolean;
};

export type BalanceMap = Map<string, AccountBalance>;

export async function accountBalances(userId: string): Promise<BalanceMap> {
  const rows = await db()
    .select({
      accountId: transactions.accountId,
      cleared: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.status} = 'posted'), 0)`,
      pending: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.status} = 'pending'), 0)`,
      pendingCount: sql<string>`count(*) filter (where ${transactions.status} = 'pending')`,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.accountId);

  const sums = new Map(
    rows.map((row) => [
      row.accountId,
      {
        cleared: toCents(row.cleared),
        pending: toCents(row.pending),
        pendingCount: Number(row.pendingCount ?? 0),
      },
    ]),
  );

  const list = await listAccounts(userId, true);
  const balances: BalanceMap = new Map();

  for (const account of list) {
    const sum = sums.get(account.id) ?? { cleared: 0, pending: 0, pendingCount: 0 };
    const clearedCents = toCents(account.openingBalance) + sum.cleared;
    balances.set(account.id, {
      clearedCents,
      pendingCents: sum.pending,
      availableCents: clearedCents + sum.pending,
      pendingCount: sum.pendingCount,
      bankLedgerCents:
        account.ledgerBalance === null ? null : toCents(account.ledgerBalance),
      bankAvailableCents:
        account.availableBalance === null ? null : toCents(account.availableBalance),
      balanceUpdatedAt: account.balanceUpdatedAt,
      isLinked: Boolean(account.connectionId),
    });
  }

  return balances;
}

/** Totals across every account a person holds. */
export function totalBalances(balances: BalanceMap, accountIds?: string[]) {
  const entries: AccountBalance[] = [];
  if (accountIds) {
    for (const id of accountIds) {
      const balance = balances.get(id);
      if (balance) entries.push(balance);
    }
  } else {
    entries.push(...balances.values());
  }

  return entries.reduce(
    (total, balance) => ({
      clearedCents: total.clearedCents + balance.clearedCents,
      pendingCents: total.pendingCents + balance.pendingCents,
      availableCents: total.availableCents + balance.availableCents,
      pendingCount: total.pendingCount + balance.pendingCount,
    }),
    { clearedCents: 0, pendingCents: 0, availableCents: 0, pendingCount: 0 },
  );
}

export type TransactionFilter = {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  businessOnly?: boolean;
  /** 'pending' | 'posted' | 'declined'. Declined rows are hidden by default. */
  status?: string;
  /** Free text matched against description and merchant. */
  search?: string;
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
  if (filter.businessOnly) conditions.push(eq(transactions.isBusiness, true));

  if (filter.status) {
    conditions.push(eq(transactions.status, filter.status));
  } else {
    // Released authorisations are history, not money — keep them out of the
    // default view but reachable with an explicit filter.
    conditions.push(ne(transactions.status, "declined"));
  }

  if (filter.search) {
    const term = `%${filter.search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${transactions.description}) like ${term}`,
        sql`lower(coalesce(${transactions.merchant}, '')) like ${term}`,
        sql`lower(coalesce(${transactions.notes}, '')) like ${term}`,
      )!,
    );
  }

  return db()
    .select({
      transaction: transactions,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryColour: categories.colour,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    // Pending items float to the top: they are the ones still in motion.
    .orderBy(
      sql`case when ${transactions.status} = 'pending' then 0 else 1 end`,
      desc(transactions.occurredOn),
      desc(transactions.createdAt),
    )
    .limit(filter.limit ?? 100)
    .offset(filter.offset ?? 0);
}

/** Everything the bank has authorised but not yet settled. */
export async function pendingTransactions(userId: string, limit = 25) {
  return db()
    .select({
      transaction: transactions,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(eq(transactions.userId, userId), eq(transactions.status, "pending")),
    )
    .orderBy(desc(transactions.occurredOn))
    .limit(limit);
}

/** Bank links, newest first, with how many accounts each one feeds. */
export async function listBankConnections(userId: string) {
  const rows = await db()
    .select({
      connection: bankConnections,
      accountCount: sql<string>`(
        select count(*) from ${accounts}
        where ${accounts.connectionId} = ${bankConnections.id}
          and ${accounts.archived} = false
      )`,
    })
    .from(bankConnections)
    .where(eq(bankConnections.userId, userId))
    .orderBy(desc(bankConnections.createdAt));

  return rows.map((row) => ({
    ...row.connection,
    accountCount: Number(row.accountCount ?? 0),
  }));
}

/**
 * Transactions in the rolling 12 months, which is what the plan limits
 * describe. Counting every row ever entered would turn a yearly allowance into
 * a lifetime one.
 */
export async function countTransactions(userId: string): Promise<number> {
  const since = addDays(todayIso(), -365);
  const rows = await db()
    .select({ count: sql<string>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, since),
        ne(transactions.status, "declined"),
      ),
    );
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
        ne(transactions.status, "declined"),
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
        ne(transactions.status, "declined"),
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
  // Bills more than 60 days overdue are stale data, not a reminder — they
  // would otherwise sit at the top of the dashboard forever.
  const floor = addDays(today, -60);
  return db()
    .select({ bill: recurringBills, categoryName: categories.name })
    .from(recurringBills)
    .leftJoin(categories, eq(recurringBills.categoryId, categories.id))
    .where(
      and(
        eq(recurringBills.userId, userId),
        eq(recurringBills.archived, false),
        gte(recurringBills.nextDueOn, floor),
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
    .where(and(eq(transactions.userId, userId), ne(transactions.status, "declined")))
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
        // BAS is prepared from settled money only.
        eq(transactions.status, "posted"),
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
