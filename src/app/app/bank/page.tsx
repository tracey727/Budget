import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import {
  accountBalances,
  listAccounts,
  listBankConnections,
  pendingTransactions,
  totalBalances,
} from "@/lib/data/queries";
import { activeProvider, bankLive } from "@/lib/bank/provider";
import { lastSyncFor } from "@/lib/bank/sync";
import {
  disconnectBankAction,
  syncBankAction,
  toggleAccountSyncAction,
} from "@/lib/actions/bank";
import { formatMoney, toCents } from "@/lib/money";
import { formatDateAu } from "@/lib/dates";
import { cronConfigured } from "@/lib/env";
import { BalanceSummary } from "@/components/app/BalanceSummary";
import { StatusBadge } from "@/components/app/StatusBadge";
import { PaywallCard } from "@/components/app/PaywallCard";
import { SubmitButton } from "@/components/SubmitButton";
import { ConnectBankForm } from "./ConnectBankForm";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { label: string; dot: string; tone: string }> = {
  active: { label: "Connected", dot: "gm-dot-live", tone: "" },
  pending: { label: "Waiting on your bank", dot: "gm-dot-warn", tone: "" },
  action_needed: { label: "Needs your attention", dot: "gm-dot-warn", tone: "" },
  expired: { label: "Consent expired", dot: "gm-dot-off", tone: "" },
  revoked: { label: "Disconnected", dot: "gm-dot-off", tone: "" },
  error: { label: "Not syncing", dot: "gm-dot-off", tone: "" },
};

function relative(date: Date | null): string {
  if (!date) return "never";
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default async function BankPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    imported?: string;
    error?: string;
    pending?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  if (!user.limits.bankFeed) {
    return (
      <div className="space-y-6">
        <h1 className="gm-display text-3xl font-semibold">Your bank</h1>
        <PaywallCard
          title="Connect your bank on Personal Premium"
          body="Link your accounts once and transactions arrive on their own — pending the moment your card is used, cleared the moment your bank settles them. No more typing in receipts or importing statements."
        />
      </div>
    );
  }

  const provider = activeProvider();
  const [connections, accounts, balances, pending, lastRun, institutions] =
    await Promise.all([
      listBankConnections(user.id),
      listAccounts(user.id),
      accountBalances(user.id),
      pendingTransactions(user.id, 12),
      lastSyncFor(user.id),
      provider.listInstitutions().catch(() => []),
    ]);

  const linkedAccounts = accounts.filter((account) => account.connectionId);
  const totals = totalBalances(
    balances,
    linkedAccounts.map((account) => account.id),
  );
  const live = bankLive();
  const anyActive = connections.some((c) => c.status === "active");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="gm-display text-3xl font-semibold">Your bank</h1>
          <p className="gm-muted mt-1 text-sm">
            {anyActive
              ? `Balances update on their own. Last checked ${relative(lastRun?.startedAt ?? null)}.`
              : "Link an account and transactions arrive by themselves."}
          </p>
        </div>

        {anyActive && (
          <form action={syncBankAction}>
            <SubmitButton className="gm-btn-secondary" pendingLabel="Checking your bank…">
              Sync now
            </SubmitButton>
          </form>
        )}
      </div>

      {params.connected && (
        <p className="gm-alert-ok text-sm font-medium" role="status">
          Your bank is connected.{" "}
          {Number(params.imported ?? 0) > 0
            ? `${params.imported} transactions imported, and anything still pending is already counted against what is safe to spend.`
            : "New transactions will appear as your bank reports them."}
        </p>
      )}
      {params.pending && (
        <p className="gm-alert-warn text-sm font-medium" role="status">
          Your bank is still setting the connection up. It usually takes a minute
          or two — this page will show the accounts as soon as they arrive.
        </p>
      )}
      {params.error && (
        <p className="gm-alert-error text-sm font-medium" role="alert">
          {params.error === "cancelled"
            ? "The connection was cancelled, so nothing was linked."
            : "That connection could not be completed. Nothing was changed — you can try again below."}
        </p>
      )}

      {/* Headline: what the linked accounts add up to. */}
      {linkedAccounts.length > 0 && (
        <section className="gm-card">
          <h2 className="mb-4 font-bold">Across your linked accounts</h2>
          <BalanceSummary
            clearedCents={totals.clearedCents}
            pendingCents={totals.pendingCents}
            availableCents={totals.availableCents}
            pendingCount={totals.pendingCount}
          />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {connections.length === 0 ? (
            <div className="gm-card">
              <h2 className="font-bold">Nothing linked yet</h2>
              <p className="gm-muted mt-2 text-sm leading-relaxed">
                A linked account does three things a spreadsheet cannot: it shows
                a purchase the moment the card is used, it tells you when the
                bank settles it, and it keeps the balance you see honest by
                deducting what has not cleared yet.
              </p>
            </div>
          ) : (
            connections.map((connection) => {
              const status = STATUS_COPY[connection.status] ?? STATUS_COPY.error;
              const mine = accounts.filter(
                (account) => account.connectionId === connection.id,
              );

              return (
                <section key={connection.id} className="gm-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{connection.institutionName}</h2>
                      <p className="gm-muted mt-1 flex items-center gap-2 text-xs">
                        <span className={`gm-dot ${status.dot}`} aria-hidden />
                        {status.label}
                        <span aria-hidden>·</span>
                        Synced {relative(connection.lastSyncedAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {connection.status !== "revoked" && (
                        <form action={syncBankAction}>
                          <input
                            type="hidden"
                            name="connectionId"
                            value={connection.id}
                          />
                          <SubmitButton
                            className="gm-btn-secondary text-xs"
                            pendingLabel="Checking…"
                          >
                            Sync
                          </SubmitButton>
                        </form>
                      )}
                      {connection.status !== "revoked" && (
                        <form action={disconnectBankAction}>
                          <input
                            type="hidden"
                            name="connectionId"
                            value={connection.id}
                          />
                          <button
                            type="submit"
                            className="gm-muted text-xs hover:text-[var(--bad)]"
                          >
                            Disconnect
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {connection.lastError && (
                    <p className="gm-alert-warn mt-3 text-xs">{connection.lastError}</p>
                  )}

                  {connection.consentExpiresAt && connection.status === "active" && (
                    <p className="gm-muted mt-3 text-xs">
                      Consent runs until{" "}
                      {formatDateAu(
                        connection.consentExpiresAt.toISOString().slice(0, 10),
                      )}
                      . We will remind you before it lapses.
                    </p>
                  )}

                  {mine.length > 0 && (
                    <ul className="mt-4 space-y-3 border-t border-[var(--gold-line-soft)] pt-4">
                      {mine.map((account) => {
                        const balance = balances.get(account.id);
                        return (
                          <li key={account.id} className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{account.name}</p>
                              <p className="gm-muted text-xs">
                                {account.bsbLast3 && account.accountLast4
                                  ? `BSB •••${account.bsbLast3} · ••••${account.accountLast4}`
                                  : account.accountLast4
                                    ? `••••${account.accountLast4}`
                                    : account.type}
                                {!account.syncEnabled && " · paused"}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-black">
                                  {formatMoney(balance?.availableCents ?? 0)}
                                </p>
                                <p className="gm-muted text-xs">
                                  {balance && balance.pendingCents !== 0
                                    ? `${formatMoney(balance.clearedCents)} cleared · ${formatMoney(balance.pendingCents)} pending`
                                    : "All settled"}
                                </p>
                              </div>
                              <form action={toggleAccountSyncAction}>
                                <input type="hidden" name="accountId" value={account.id} />
                                <button
                                  type="submit"
                                  className="gm-muted text-xs hover:text-[var(--gold-bright)]"
                                >
                                  {account.syncEnabled ? "Pause" : "Resume"}
                                </button>
                              </form>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })
          )}

          {/* What is in flight right now. */}
          <section className="gm-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Waiting to clear</h2>
              <Link
                href="/app/transactions?status=pending"
                className="text-sm font-semibold text-[var(--gold-bright)] hover:underline"
              >
                See all
              </Link>
            </div>

            {pending.length === 0 ? (
              <p className="gm-muted text-sm">
                Nothing is pending. Everything your bank has told us about has
                settled.
              </p>
            ) : (
              <ul className="space-y-3">
                {pending.map((row) => (
                  <li
                    key={row.transaction.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {row.transaction.merchant ?? row.transaction.description}
                      </p>
                      <p className="gm-muted text-xs">
                        {formatDateAu(row.transaction.occurredOn)} · {row.accountName}{" "}
                        <StatusBadge
                          status={row.transaction.status}
                          pendingSince={row.transaction.pendingSince}
                        />
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-[#f2ddb0]">
                      {formatMoney(toCents(row.transaction.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <div className="gm-card h-fit">
            <h2 className="mb-1 font-bold">Link an account</h2>
            <p className="gm-muted mb-4 text-xs">{provider.label}</p>
            <ConnectBankForm institutions={institutions} live={live} />
          </div>

          <div className="gm-card h-fit">
            <h3 className="font-bold">How the numbers work</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-semibold">Pending</dt>
                <dd className="gm-muted mt-0.5 leading-relaxed">
                  Your bank has authorised the payment but not settled it. The
                  amount can still change, and the bank can release it entirely.
                  We deduct it from what is safe to spend straight away.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Cleared</dt>
                <dd className="gm-muted mt-0.5 leading-relaxed">
                  Settled by the bank. This is the balance on your statement,
                  and the figure budgets and reports are built from.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Safe to spend</dt>
                <dd className="gm-muted mt-0.5 leading-relaxed">
                  Cleared money less everything still pending. It is the only
                  one of the three you can act on without getting caught out.
                </dd>
              </div>
            </dl>
          </div>

          {!cronConfigured() && anyActive && (
            <p className="gm-alert-warn text-xs leading-relaxed">
              Scheduled syncing is off because <code>CRON_SECRET</code> is not
              set. Balances still update when your bank notifies us and when you
              press Sync now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
