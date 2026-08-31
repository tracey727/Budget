import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { listTrips, tripSpendMap } from "@/lib/data/queries";
import { archiveTripAction } from "@/lib/actions/trips";
import { TripForm } from "./TripForm";
import { formatMoney, toCents } from "@/lib/money";
import { formatDateAu, todayIso, daysBetween } from "@/lib/dates";
import { UpgradeNotice } from "@/components/app/UpgradeNotice";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const user = await requireUser();
  const [trips, spend] = await Promise.all([
    listTrips(user.id),
    tripSpendMap(user.id),
  ]);
  const today = todayIso();
  const atLimit = Number.isFinite(user.limits.trips) && trips.length >= user.limits.trips;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Trips</h1>
        <p className="gm-muted mt-1 text-sm">
          Give a journey its own budget, then tag spending to it as you go.
        </p>
      </div>

      {atLimit && (
        <UpgradeNotice
          message={`Starter covers ${user.limits.trips} trip at a time. Upgrade for unlimited trips.`}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {trips.length === 0 ? (
            <div className="gm-card">
              <p className="gm-muted text-sm">
                No trips yet. Add one on the right — even a rough budget beats
                guessing at the fuel bowser.
              </p>
            </div>
          ) : (
            trips.map((trip) => {
              const spentCents = spend.get(trip.id) ?? 0;
              const budgetCents = trip.budgetAmount ? toCents(trip.budgetAmount) : null;
              const percent =
                budgetCents && budgetCents > 0
                  ? Math.min(999, Math.round((spentCents / budgetCents) * 100))
                  : 0;
              const over = budgetCents !== null && spentCents > budgetCents;

              const upcoming = trip.startsOn ? daysBetween(today, trip.startsOn) : null;
              const running =
                trip.startsOn && trip.endsOn
                  ? trip.startsOn <= today && today <= trip.endsOn
                  : false;

              // Remaining budget per day, so the number means something on the road.
              let perDay: number | null = null;
              if (running && budgetCents !== null && trip.endsOn) {
                const daysLeft = Math.max(1, daysBetween(today, trip.endsOn) + 1);
                perDay = Math.max(0, Math.round((budgetCents - spentCents) / daysLeft));
              }

              return (
                <div key={trip.id} className="gm-card">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-2 font-bold">
                        {trip.name}
                        {running && (
                          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                            On the road
                          </span>
                        )}
                      </h2>
                      <p className="gm-muted text-xs">
                        {trip.destination ? `${trip.destination} · ` : ""}
                        {trip.startsOn && trip.endsOn
                          ? `${formatDateAu(trip.startsOn)} – ${formatDateAu(trip.endsOn)}`
                          : trip.startsOn
                            ? `From ${formatDateAu(trip.startsOn)}`
                            : "No dates set"}
                        {trip.plannedKm ? ` · ${trip.plannedKm.toLocaleString("en-AU")} km planned` : ""}
                      </p>
                      {upcoming !== null && upcoming > 0 && (
                        <p className="gm-muted mt-0.5 text-xs">
                          Leaves in {upcoming} day{upcoming === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/app/transactions?trip=${trip.id}`}
                        className="text-xs font-semibold text-brand-600 hover:underline"
                      >
                        View spending
                      </Link>
                      <form action={archiveTripAction}>
                        <input type="hidden" name="id" value={trip.id} />
                        <button
                          type="submit"
                          className="gm-muted text-xs hover:text-red-600"
                          aria-label={`Archive ${trip.name}`}
                        >
                          Archive
                        </button>
                      </form>
                    </div>
                  </div>

                  {budgetCents !== null ? (
                    <>
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${trip.name} budget used`}
                      >
                        <div
                          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-brand-500"}`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="gm-muted">
                          {formatMoney(spentCents)} of {formatMoney(budgetCents)}
                        </span>
                        <span
                          className={
                            over ? "font-semibold text-red-600 dark:text-red-400" : "gm-muted"
                          }
                        >
                          {over
                            ? `${formatMoney(spentCents - budgetCents)} over`
                            : `${formatMoney(budgetCents - spentCents)} left`}
                        </span>
                      </div>
                      {perDay !== null && (
                        <p className="gm-muted mt-1.5 text-xs">
                          About {formatMoney(perDay)} a day for the rest of this trip.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="gm-muted text-sm">
                      {formatMoney(spentCents)} spent · no budget set
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="gm-card h-fit">
          <h2 className="mb-4 font-bold">Plan a trip</h2>
          <TripForm disabled={atLimit} />
        </div>
      </div>
    </div>
  );
}
