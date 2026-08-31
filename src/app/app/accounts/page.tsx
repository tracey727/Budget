import { requireUser } from "@/lib/auth/require";
import { accountBalances, listAccounts } from "@/lib/data/queries";
import { archiveAccountAction } from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/lib/labels";
import { AccountForm } from "./AccountForm";
import { formatMoney } from "@/lib/money";
import { UpgradeNotice } from "@/components/app/UpgradeNotice";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();
  const [accounts, balances] = await Promise.all([
    listAccounts(user.id),
    accountBalances(user.id),
  ]);

  const total = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);
  const atLimit =
    Number.isFinite(user.limits.accounts) && accounts.length >= user.limits.accounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Accounts</h1>
        <p className="gm-muted text-sm">
          Net position: <span className="font-bold text-[var(--gm-text)]">{formatMoney(total)}</span>
        </p>
      </div>

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
              const balance = balances.get(account.id) ?? 0;
              return (
                <div key={account.id} className="gm-card flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{account.name}</h2>
                    <p className="gm-muted text-xs">
                      {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ?? account.type}
                      {account.institution ? ` · ${account.institution}` : ""}
                      {account.isBusiness ? " · Business" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className={`font-black ${balance < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                      {formatMoney(balance)}
                    </span>
                    <form action={archiveAccountAction}>
                      <input type="hidden" name="id" value={account.id} />
                      <button
                        type="submit"
                        className="gm-muted text-xs hover:text-red-600"
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
