import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { listAccounts, listCategories, listTransactions } from "@/lib/data/queries";
import { deleteTransactionAction } from "@/lib/actions/transactions";
import { formatMoney, toCents } from "@/lib/money";
import { formatDateAu } from "@/lib/dates";
import { EmptyState } from "@/components/app/EmptyState";

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
    sp.set("page", String(next));
    return `/app/transactions?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Transactions</h1>
        <div className="flex gap-2">
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
        <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-300">
          Transaction saved.
        </p>
      )}

      {/* Filters */}
      <form className="gm-card grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
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
                  return (
                    <tr key={row.transaction.id}>
                      <td className="whitespace-nowrap">{formatDateAu(row.transaction.occurredOn)}</td>
                      <td>
                        <span className="font-medium">{row.transaction.description}</span>
                        {row.transaction.isBusiness && (
                          <span className="ml-2 rounded bg-ink-200 px-1.5 py-0.5 text-[10px] font-bold uppercase dark:bg-ink-800">
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
                      <td className={`whitespace-nowrap text-right font-semibold ${cents >= 0 ? "text-brand-600" : ""}`}>
                        {formatMoney(cents)}
                      </td>
                      <td className="text-right">
                        <form action={deleteTransactionAction}>
                          <input type="hidden" name="id" value={row.transaction.id} />
                          <button
                            type="submit"
                            className="gm-muted text-xs hover:text-red-600"
                            aria-label={`Delete ${row.transaction.description}`}
                          >
                            Delete
                          </button>
                        </form>
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
