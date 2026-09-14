import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { accountBalances, listAccounts, totalBalances } from "@/lib/data/queries";
import { archiveAccountAction } from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/lib/labels";
import { AccountForm } from "./AccountForm";
import { formatMoney } from "@/lib/money";
import { UpgradeNotice } from "@/components/app/UpgradeNotice";
import { BalanceSummary } from "@/components/app/BalanceSummary";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();
  const [accounts, balances] = await Promise.all([
    listAccounts(user.id),
    accountBalances(user.id),
  ]);

  const totals = totalBalances(
    balances,
    accounts.map((account) => account.id),
  );
  const atLimit =
    Number.isFinite(user.limits.accounts) && accounts.length >= user.limits.accounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="gm-display text-3xl font-semibold">Accounts</h1>
        <Link href="/app/bank" className="gm-btn-secondary">
          Connect a bank
        </Link>
      </div>

      {/* Totals first, split the way the money actually behaves. */}
      <section className="gm-card">
        <BalanceSummary
          clearedCents={totals.clearedCents}
          pendingCents={totals.pendingCents}
          availableCents={totals.availableCents}
          pendingCount={totals.pendingCount}
        />
      </section>

      {atLimit && (
        <UpgradeNotice
          message={`You are using all ${user.limits.accounts} accounts included with Starter.`}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {accounts.length === 0 ? (
            <div className="gm-card">
              <p className="gm-muted text-sm">No accounts yet. Add your first one.</p>
            </div>
          ) : (
            accounts.map((account) => {
              const balance = balances.get(account.id);
              const available = balance?.availableCents ?? 0;
              const hasPending = (balance?.pendingCount ?? 0) > 0;

              return (
                <div key={account.id} className="gm-card flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">
                      {account.name}
                      {balance?.isLinked && (
                        <span
                          className="gm-dot gm-dot-live ml-2 align-middle"
                          aria-label="Linked to your bank"
                          title="Linked to your bank"
                        />
                      )}
                    </h2>
                    <p className="gm-muted text-xs">
                      {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ?? account.type}
                      {account.institution ? ` · ${account.institution}` : ""}
                      {account.isBusiness ? " · Business" : ""}
                    </p>
                    {hasPending && (
                      <p className="mt-1 text-xs text-[#f2ddb0]">
                        {formatMoney(balance!.clearedCents)} cleared ·{" "}
                        {formatMoney(balance!.pendingCents)} pending across{" "}
                        {balance!.pendingCount} transaction
                        {balance!.pendingCount === 1 ? "" : "s"}
                      </p>
                    )}
                    {balance?.isLinked &&
                      balance.bankAvailableCents !== null &&
                      balance.bankAvailableCents !== available && (
                        <p className="gm-muted mt-1 text-xs">
                          Your bank reports {formatMoney(balance.bankAvailableCents)}{" "}
                          available. The difference is transactions it has not
                          published yet.
                        </p>
                      )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <span className={`font-black ${available < 0 ? "text-[var(--bad)]" : ""}`}>
                        {formatMoney(available)}
                      </span>
                      <p className="gm-muted text-[10px] font-semibold uppercase tracking-[0.12em]">
                        {hasPending ? "Available" : "Balance"}
                      </p>
                    </div>
                    <form action={archiveAccountAction}>
                      <input type="hidden" name="id" value={account.id} />
                      <button
                        type="submit"
                        className="gm-muted text-xs hover:text-[var(--bad)]"
                        aria-label={`Archive ${account.name}`}
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
          <h2 className="mb-4 font-bold">Add an account</h2>
          <AccountForm businessTools={user.limits.businessTools} disabled={atLimit} />
        </div>
      </div>
    </div>
  );
}
