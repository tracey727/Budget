import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { listAccounts } from "@/lib/data/queries";
import { ImportForm } from "./ImportForm";
import { PaywallCard } from "@/components/app/PaywallCard";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await requireUser();

  if (!user.limits.csvImport) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-black tracking-tight">Import transactions</h1>
        <PaywallCard
          title="CSV import is part of Personal Premium"
          body="Import statements from any Australian bank. Genevieve App reads the columns, converts the dates and skips anything already imported."
        />
      </div>
    );
  }

  const accounts = await listAccounts(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/app/transactions" className="gm-muted text-sm hover:text-brand-600">
          ← Back to transactions
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Import transactions</h1>
        <p className="gm-muted mt-1 text-sm">
          Export a CSV from your online banking and upload it here.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="gm-card">
          <p className="text-sm">
            Add an account first.{" "}
            <Link href="/app/accounts" className="font-semibold text-brand-600 hover:underline">
              Add an account
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="gm-card">
            <ImportForm accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
          </div>

          <div className="gm-card">
            <h2 className="font-bold">What Genevieve App accepts</h2>
            <ul className="gm-muted mt-2.5 space-y-1.5 text-sm">
              <li>• Dates as DD/MM/YYYY (Australian format) or YYYY-MM-DD</li>
              <li>• A single Amount column, or separate Debit and Credit columns</li>
              <li>• Amounts with $ signs, commas, or (brackets) for negatives</li>
              <li>• Files with or without a header row, up to 2 MB</li>
              <li>• Duplicates are detected and skipped automatically</li>
            </ul>
            <p className="gm-muted mt-3 text-xs">
              Tested against export formats from CommBank, NAB, Westpac, ANZ and Bendigo.
              Imported rows arrive uncategorised — assign categories from the
              transactions list.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
