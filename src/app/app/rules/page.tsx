import { asc, eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, categoryRules, transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { listCategories } from "@/lib/data/queries";
import { applyRuleToPastAction, deleteRuleAction } from "@/lib/actions/rules";
import { PaywallCard } from "@/components/app/PaywallCard";
import { SubmitButton } from "@/components/SubmitButton";
import { RuleForm } from "./RuleForm";

export const dynamic = "force-dynamic";

const MATCH_LABELS: Record<string, string> = {
  contains: "contains",
  starts_with: "starts with",
  equals: "is exactly",
};

export default async function RulesPage() {
  const user = await requireUser();

  if (!user.limits.csvImport) {
    return (
      <div className="space-y-6">
        <h1 className="gm-display text-3xl font-semibold">Rules</h1>
        <PaywallCard
          title="Automatic categorisation is part of Personal Premium"
          body="Write a rule once and every matching transaction — imported, or arriving from your bank — files itself from then on."
        />
      </div>
    );
  }

  const [rules, categoryList, uncategorised] = await Promise.all([
    db()
      .select({ rule: categoryRules, categoryName: categories.name })
      .from(categoryRules)
      .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
      .where(
        and(
          eq(categoryRules.userId, user.id),
          eq(categoryRules.archived, false),
        ),
      )
      .orderBy(asc(categoryRules.priority), asc(categoryRules.pattern)),
    listCategories(user.id),
    db()
      .select({ count: sql<string>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          sql`${transactions.categoryId} is null`,
        ),
      ),
  ]);

  const uncategorisedCount = Number(uncategorised[0]?.count ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-3xl font-semibold">Rules</h1>
        <p className="gm-muted mt-1 text-sm">
          Rules run on every transaction as it arrives, whether it came from your
          bank or a statement you imported. The first matching rule wins.
        </p>
      </div>

      {uncategorisedCount > 0 && (
        <p className="gm-alert-gold text-sm">
          {uncategorisedCount} transaction{uncategorisedCount === 1 ? " is" : "s are"}{" "}
          uncategorised. Adding a rule and applying it to past transactions is
          usually faster than sorting them one at a time.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {rules.length === 0 ? (
            <div className="gm-card">
              <p className="gm-muted text-sm">
                No rules yet. Until you write one, transactions are matched
                against a built-in list of common Australian merchants.
              </p>
            </div>
          ) : (
            rules.map((row) => (
              <div
                key={row.rule.id}
                className="gm-card flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="gm-muted">Text {MATCH_LABELS[row.rule.matchType]}</span>{" "}
                    <span className="font-bold">{row.rule.pattern}</span>{" "}
                    <span className="gm-muted">→</span>{" "}
                    <span className="font-semibold">{row.categoryName}</span>
                    {row.rule.markBusiness && <span className="gm-pill ml-2">Business</span>}
                  </p>
                  {row.rule.renameTo && (
                    <p className="gm-muted mt-1 text-xs">
                      Shown as &ldquo;{row.rule.renameTo}&rdquo;
                    </p>
                  )}
                  {row.rule.timesApplied > 0 && (
                    <p className="gm-muted mt-1 text-xs">
                      Applied to {row.rule.timesApplied} transaction
                      {row.rule.timesApplied === 1 ? "" : "s"}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <form action={applyRuleToPastAction}>
                    <input type="hidden" name="id" value={row.rule.id} />
                    <SubmitButton
                      className="gm-btn-secondary text-xs"
                      pendingLabel="Applying…"
                      title="Apply to uncategorised transactions already in your ledger"
                    >
                      Apply to past
                    </SubmitButton>
                  </form>
                  <form action={deleteRuleAction}>
                    <input type="hidden" name="id" value={row.rule.id} />
                    <button type="submit" className="gm-muted text-xs hover:text-[var(--bad)]">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="gm-card h-fit">
          <h2 className="mb-4 font-bold">Add a rule</h2>
          <RuleForm
            categories={categoryList.map((c) => ({ id: c.id, name: c.name }))}
            businessTools={user.limits.businessTools}
          />
        </div>
      </div>
    </div>
  );
}
