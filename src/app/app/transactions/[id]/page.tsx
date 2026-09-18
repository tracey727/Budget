import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { listAccounts, listCategories } from "@/lib/data/queries";
import { markPendingAction, clearTransactionAction } from "@/lib/actions/bank";
import { toCents } from "@/lib/money";
import { formatDateLong } from "@/lib/dates";
import { StatusBadge } from "@/components/app/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { TransactionForm } from "../new/TransactionForm";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const rows = await db()
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);

  const transaction = rows[0];
  if (!transaction) notFound();

  const [accounts, categories] = await Promise.all([
    listAccounts(user.id),
    listCategories(user.id),
  ]);

  const cents = toCents(transaction.amount);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/transactions" className="gm-muted text-sm hover:text-[var(--gold-bright)]">
          ← Back to transactions
        </Link>
        <h1 className="gm-display mt-2 text-3xl font-semibold">Edit transaction</h1>
        <p className="gm-muted mt-1 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge
            status={transaction.status}
            pendingSince={transaction.pendingSince}
          />
          {transaction.status === "pending"
            ? "Authorised by your bank, not settled yet."
            : transaction.status === "declined"
              ? "The bank released this hold without settling it."
              : transaction.clearedAt
                ? `Cleared ${formatDateLong(transaction.clearedAt.toISOString().slice(0, 10))}.`
                : "Settled."}
        </p>
      </div>

      {/* Clearing controls live outside the form: they are one-click state
          changes, not part of editing the transaction's detail. */}
      <div className="gm-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Clearing status</p>
          <p className="gm-muted text-xs">
            {transaction.source === "bank"
              ? "Your bank sets this automatically. Change it only if you know it has settled and your bank is slow to say so."
              : "Set this yourself for anything you have paid but which has not left your account yet."}
          </p>
        </div>
        {transaction.status === "pending" ? (
          <form action={clearTransactionAction}>
            <input type="hidden" name="id" value={transaction.id} />
            <SubmitButton className="gm-btn-secondary" pendingLabel="Clearing…">
              Mark as cleared
            </SubmitButton>
          </form>
        ) : (
          <form action={markPendingAction}>
            <input type="hidden" name="id" value={transaction.id} />
            <SubmitButton className="gm-btn-secondary" pendingLabel="Updating…">
              Mark as pending
            </SubmitButton>
          </form>
        )}
      </div>

      <div className="gm-card">
        <TransactionForm
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind,
          }))}
          businessTools={user.limits.businessTools}
          initial={{
            id: transaction.id,
            accountId: transaction.accountId,
            categoryId: transaction.categoryId,
            amount: (Math.abs(cents) / 100).toFixed(2),
            direction: cents >= 0 ? "in" : "out",
            description: transaction.description,
            merchant: transaction.merchant ?? "",
            occurredOn: transaction.occurredOn,
            notes: transaction.notes ?? "",
            isBusiness: transaction.isBusiness,
            hasGst: transaction.gstAmount !== null,
            status: transaction.status,
            fromBank: transaction.source === "bank",
          }}
        />
      </div>
    </div>
  );
}
