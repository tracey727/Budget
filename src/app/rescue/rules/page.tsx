import { requireTenant } from "@/lib/rescue/tenant";
import { RULES } from "@/lib/rescue/rules";
import { openFindingsByRule } from "@/lib/rescue/queries";
import { formatMoney } from "@/lib/money";
import { RunDetection } from "../RunDetection";

export const dynamic = "force-dynamic";

/**
 * The rule catalogue.
 *
 * Every rule is listed with its version and the exact logic hash that produced
 * the findings attached to it — so a customer can always ask "which version of
 * which rule said this?" and get an answer.
 */
export default async function RulesPage() {
  const context = await requireTenant();
  const counts = await openFindingsByRule(context.tenant.id);
  const byId = new Map(counts.map((row) => [row.ruleId, row]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-3xl font-semibold">Detection rules</h1>
        <p className="gm-muted mt-1 text-sm">
          Ten deterministic rules for allied health. Each one is versioned, and every finding records the
          version and logic that produced it, so a later change can never rewrite what an earlier version
          said.
        </p>
      </div>

      <div className="space-y-3">
        {RULES.map((rule) => {
          const stats = byId.get(rule.id);
          return (
            <div key={rule.id} className="gm-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    <span className="gm-muted mr-2 font-mono text-xs">{rule.id}</span>
                    {rule.name}
                  </h2>
                  <p className="gm-muted mt-1 text-sm">{rule.description}</p>
                  <p className="gm-muted mt-2 font-mono text-[10px]">
                    version {rule.version} · logic {rule.logicHash} · {rule.domain.replace("_", " ")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {stats ? `${stats.count} open` : "No open findings"}
                  </p>
                  {stats && stats.cents > 0 && (
                    <p className="gm-muted text-xs">{formatMoney(stats.cents)} at risk</p>
                  )}
                  {context.can("run_rules") && (
                    <div className="mt-2">
                      <RunDetection ruleId={rule.id} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="gm-muted text-xs">
        Rules never charge, credit, refund or write anything off. A rule that cannot establish the facts
        returns HOLD, and a held finding is kept out of every claimed total.
      </p>
    </div>
  );
}
