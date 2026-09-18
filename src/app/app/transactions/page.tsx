import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { listAccounts, listCategories, listTransactions } from "@/lib/data/queries";
import { deleteTransactionAction } from "@/lib/actions/transactions";
import { clearTransactionAction } from "@/lib/actions/bank";
import { formatMoney, toCents } from "@/lib/money";
import { formatDateAu } from "@/lib/dates";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    account?: string;
    category?: string;
    from?: string;
    to?: string;
    status?: string;
    q?: string;
    page?: string;
    added?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [rows, accounts, categories] = await Promise.all([
    listTransactions(user.id, {
      accountId: params.account || undefined,
      categoryId: params.category || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      status: params.status || undefined,
      search: params.q || undefined,
      limit: PAGE_SIZE + 1,
      offset: (page - 1) * PAGE_SIZE,
    }),
    listAccounts(user.id),
    listCategories(user.id),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);

  const query = (next: number) => {
    const sp = new URLSearchParams();
    if (params.account) sp.set("account", params.account);
    if (params.category) sp.set("category", params.category);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    if (params.status) sp.set("status", params.status);
    if (params.q) sp.set("q", params.q);
    sp.set("page", String(next));
    return `/app/transactions?${sp.toString()}`;
  };

  // Pending money is the part of the list that is still moving, so it gets its
  // own running total rather than being buried in the rows.
  const pendingOnPage = visible.filter(
    (row) => row.transaction.status === "pending",
  );
  const pendingTotal = pendingOnPage.reduce(
    (total, row) => total + toCents(row.transaction.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gm-display text-3xl font-semibold">Transactions</h1>
        <div className="flex flex-wrap gap-2">
          {user.limits.bankFeed && (
            <Link href="/app/bank" className="gm-btn-secondary">
              Connect a bank
            </Link>
          )}
          {user.limits.csvImport && (
            <Link href="/app/transactions/import" className="gm-btn-secondary">
              Import CSV
            </Link>
          )}
          <Link href="/app/transactions/new" className="gm-btn-primary">
            Add transaction
          </Link>
        </div>
      </div>

      {params.added && (
        <p className="gm-alert-ok text-sm font-medium">
          Transaction saved.
        </p>
      )}

      {pendingOnPage.length > 0 && (
        <p className="gm-alert-warn text-sm">
          <strong>{formatMoney(pendingTotal)}</strong> across{" "}
          {pendingOnPage.length} transaction
          {pendingOnPage.length === 1 ? " is" : "s are"} still waiting on your
          bank. It is already deducted from what is safe to spend, and the amount
          can change when it settles.
        </p>
      )}

      {/* Filters */}
      <form className="gm-card grid gap-3 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="gm-label text-xs" htmlFor="q">Search</label>
          <input
            id="q"
            name="q"
            type="search"
            className="gm-input"
            placeholder="Merchant, description or note"
            defaultValue={params.q ?? ""}
          />
        </div>
        <div>
          <label className="gm-label text-xs" htmlFor="status">Status</label>
          <select id="status" name="status" className="gm-input" defaultValue={params.status ?? ""}>
            <option value="">Pending and cleared</option>
            <option value="pending">Pending only</option>
            <option value="posted">Cleared only</option>
            <option value="declined">Released holds</option>
          </select>
        </div>
        <div>
          <label className="gm-label text-xs" htmlFor="account">Account</label>
          <select id="account" name="account" className="gm-input" defaultValue={params.account ?? ""}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="gm-label text-xs" htmlFor="category">Category</label>
          <select id="category" name="category" className="gm-input" defaultValue={params.category ?? ""}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="gm-label text-xs" htmlFor="from">From</label>
          <input id="from" name="from" type="date" className="gm-input" defaultValue={params.from ?? ""} />
        </div>
        <div>
          <label className="gm-label text-xs" htmlFor="to">To</label>
          <input id="to" name="to" type="date" className="gm-input" defaultValue={params.to ?? ""} />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="gm-btn-primary flex-1">Filter</button>
          <Link href="/app/transactions" className="gm-btn-secondary">Clear</Link>
        </div>
      </form>

      {visible.length === 0 ? (
        <EmptyState
          title="No transactions found"
          body="Nothing matches these filters yet. Add a transaction to get started."
          actionHref="/app/transactions/new"
          actionLabel="Add a transaction"
        />
      ) : (
        <>
          <div className="gm-card gm-scroll-x p-0">
            <table className="gm-table min-w-[720px]">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Category</th>
                  <th scope="col">Account</th>
                  <th scope="col" className="text-right">Amount</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const cents = toCents(row.transaction.amount);
                  const isPending = row.transaction.status === "pending";
                  const isDeclined = row.transaction.status === "declined";
                  return (
                    <tr
                      key={row.transaction.id}
                      className={isPending ? "gm-row-pending" : undefined}
                    >
                      <td className="whitespace-nowrap">{formatDateAu(row.transaction.occurredOn)}</td>
                      <td>
                        <span className={`font-medium ${isDeclined ? "line-through opacity-70" : ""}`}>
                          {row.transaction.description}
                        </span>{" "}
                        <StatusBadge
                          status={row.transaction.status}
                          pendingSince={row.transaction.pendingSince}
                        />
                        {row.transaction.isBusiness && (
                          <span className="gm-pill ml-2">
                            Business
                          </span>
                        )}
                        {row.transaction.merchant && (
                          <p className="gm-muted text-xs">{row.transaction.merchant}</p>
                        )}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: row.categoryColour ?? "#94a3b8" }}
                          />
                          {row.categoryName ?? "Uncategorised"}
                        </span>
                      </td>
                      <td className="gm-muted">{row.accountName}</td>
                      <td
                        className={`whitespace-nowrap text-right font-semibold ${
                          isDeclined
                            ? "gm-muted line-through"
                            : isPending
                              ? "text-[#f2ddb0]"
                              : cents >= 0
                                ? "text-brand-600"
                                : ""
                        }`}
                      >
                        {formatMoney(cents)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/app/transactions/${row.transaction.id}`}
                            className="gm-muted text-xs hover:text-[var(--gold-bright)]"
                            aria-label={`Edit ${row.transaction.description}`}
                          >
                            Edit
                          </Link>
                          {isPending && (
                            <form action={clearTransactionAction}>
                              <input type="hidden" name="id" value={row.transaction.id} />
                              <button
                                type="submit"
                                className="gm-muted text-xs hover:text-[var(--gold-bright)]"
                                title="Mark this as settled without waiting for the bank"
                              >
                                Clear
                              </button>
                            </form>
                          )}
                          <form action={deleteTransactionAction}>
                            <input type="hidden" name="id" value={row.transaction.id} />
                            <button
                              type="submit"
                              className="gm-muted text-xs hover:text-[var(--bad)]"
                              aria-label={`Delete ${row.transaction.description}`}
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            {page > 1 ? (
              <Link href={query(page - 1)} className="gm-btn-secondary">Previous</Link>
            ) : <span />}
            <span className="gm-muted text-sm">Page {page}</span>
            {hasMore ? (
              <Link href={query(page + 1)} className="gm-btn-secondary">Next</Link>
            ) : <span />}
          </div>
        </>
      )}
    </div>
  );
}
