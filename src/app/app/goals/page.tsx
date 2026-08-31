import { requireUser } from "@/lib/auth/require";
import { listGoals } from "@/lib/data/queries";
import { archiveGoalAction, contributeGoalAction } from "@/lib/actions/goals";
import { GOAL_KIND_LABELS } from "@/lib/labels";
import { GoalForm } from "./GoalForm";
import { formatMoney, toCents } from "@/lib/money";
import { formatDateLong, todayIso, daysBetween } from "@/lib/dates";
import { UpgradeNotice } from "@/components/app/UpgradeNotice";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id);
  const today = todayIso();

  const atLimit = Number.isFinite(user.limits.goals) && goals.length >= user.limits.goals;

  return (
    <div className="space-y-6">
      <h1 className="gm-display text-3xl font-semibold">Goals</h1>

      {atLimit && (
        <UpgradeNotice
          message={`Starter includes ${user.limits.goals} goal. Upgrade for unlimited goals.`}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {goals.length === 0 ? (
            <div className="gm-card">
              <p className="gm-muted text-sm">No goals yet. Set your first one.</p>
            </div>
          ) : (
            goals.map((goal) => {
              const target = toCents(goal.targetAmount);
              const saved = toCents(goal.savedAmount);
              const remaining = Math.max(0, target - saved);
              const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

              // What you would need to set aside each month to land on time.
              let perMonth: number | null = null;
              if (goal.targetDate && remaining > 0) {
                const days = daysBetween(today, goal.targetDate);
                if (days > 0) perMonth = Math.ceil(remaining / Math.max(1, days / 30.44));
              }

              return (
                <div key={goal.id} className="gm-card">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{goal.name}</h2>
                      <p className="gm-muted text-xs">
                        {GOAL_KIND_LABELS[goal.kind as keyof typeof GOAL_KIND_LABELS] ?? goal.kind}
                        {goal.targetDate ? ` · by ${formatDateLong(goal.targetDate)}` : ""}
                      </p>
                    </div>
                    <form action={archiveGoalAction}>
                      <input type="hidden" name="id" value={goal.id} />
                      <button
                        type="submit"
                        className="gm-muted text-xs hover:text-red-600"
                        aria-label={`Archive ${goal.name}`}
                      >
                        Archive
                      </button>
                    </form>
                  </div>

                  <div
                    className="gm-track h-2.5"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${goal.name} progress`}
                  >
                    <div className="gm-fill-gold" style={{ width: `${percent}%` }} />
                  </div>

                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="gm-muted">
                      {formatMoney(saved)} of {formatMoney(target)} · {percent}%
                    </span>
                    <span className="font-semibold">
                      {remaining === 0 ? "Goal reached 🎉" : `${formatMoney(remaining)} to go`}
                    </span>
                  </div>

                  {perMonth !== null && (
                    <p className="gm-muted mt-1.5 text-xs">
                      Put aside about {formatMoney(perMonth)} a month to reach this on time.
                    </p>
                  )}

                  <form action={contributeGoalAction} className="mt-3.5 flex gap-2">
                    <input type="hidden" name="id" value={goal.id} />
                    <label className="sr-only" htmlFor={`amount-${goal.id}`}>
                      Amount to add to {goal.name}
                    </label>
                    <input
                      id={`amount-${goal.id}`}
                      name="amount"
                      className="gm-input flex-1"
                      inputMode="decimal"
                      placeholder="Add an amount, e.g. 250.00"
                    />
                    <button type="submit" className="gm-btn-secondary shrink-0">Add</button>
                  </form>
                </div>
              );
            })
          )}
        </div>

        <div className="gm-card h-fit">
          <h2 className="mb-4 font-bold">New goal</h2>
          <GoalForm disabled={atLimit} />
        </div>
      </div>
    </div>
  );
}
