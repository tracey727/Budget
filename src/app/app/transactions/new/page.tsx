import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { listAccounts, listCategories } from "@/lib/data/queries";
import { TransactionForm } from "./TransactionForm";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([
    listAccounts(user.id),
    listCategories(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/transactions" className="gm-muted text-sm hover:text-brand-600">
          ← Back to transactions
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Add a transaction</h1>
      </div>

      {accounts.length === 0 ? (
        <div className="gm-card">
          <p className="text-sm">
            You need an account first.{" "}
            <Link href="/app/accounts" className="font-semibold text-brand-600 hover:underline">
              Add an account
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="gm-card">
          <TransactionForm
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
            businessTools={user.limits.businessTools}
          />
        </div>
      )}
    </div>
  );
}
