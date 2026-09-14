import { formatMoney } from "@/lib/money";

/**
 * The three balances, shown together because only the three together are
 * honest: a cleared balance alone overstates what is left, and an available
 * balance alone hides what the bank has yet to settle.
 */
export function BalanceSummary({
  clearedCents,
  pendingCents,
  availableCents,
  pendingCount,
  updatedAt,
  compact = false,
}: {
  clearedCents: number;
  pendingCents: number;
  availableCents: number;
  pendingCount: number;
  updatedAt?: Date | null;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="gm-muted text-xs font-semibold uppercase tracking-wide">
          Safe to spend
        </span>
        <span
          className={`font-black ${compact ? "text-lg" : "text-2xl"} ${
            availableCents < 0 ? "text-[var(--bad)]" : ""
          }`}
        >
          {formatMoney(availableCents)}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="gm-muted">Cleared at the bank</span>
        <span className="font-semibold">{formatMoney(clearedCents)}</span>
      </div>

      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="gm-muted">
          Pending
          {pendingCount > 0 ? ` · ${pendingCount} item${pendingCount === 1 ? "" : "s"}` : ""}
        </span>
        <span className={pendingCents === 0 ? "gm-muted" : "font-semibold text-[#f2ddb0]"}>
          {pendingCents === 0 ? "None" : formatMoney(pendingCents)}
        </span>
      </div>

      {updatedAt && (
        <p className="gm-muted pt-1 text-xs">
          Bank data as at{" "}
          {new Intl.DateTimeFormat("en-AU", {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Australia/Sydney",
          }).format(updatedAt)}
        </p>
      )}
    </div>
  );
}
