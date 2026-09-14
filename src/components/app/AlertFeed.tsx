import Link from "next/link";
import type { Alert } from "@/lib/db/schema";
import { formatMoney, toCents } from "@/lib/money";

const SEVERITY_CLASS: Record<string, string> = {
  critical: "gm-dot-off",
  warning: "gm-dot-warn",
  info: "gm-dot-live",
};

function when(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Sydney",
  }).format(date);
}

/**
 * The running account of what the app noticed on a person's behalf: a payment
 * clearing, a hold released, a budget running out, a bill falling due.
 */
export function AlertFeed({
  alerts,
  compact = false,
}: {
  alerts: Alert[];
  compact?: boolean;
}) {
  if (alerts.length === 0) {
    return (
      <p className="gm-muted text-sm">
        Nothing to report. Updates appear here as your bank settles payments and
        as budgets and bills come due.
      </p>
    );
  }

  return (
    <ul className={compact ? "space-y-3" : "space-y-4"}>
      {alerts.map((alert) => {
        const body = (
          <>
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={`gm-dot mt-1.5 ${SEVERITY_CLASS[alert.severity] ?? "gm-dot-live"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {alert.title}
                  {!alert.readAt && (
                    <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold-bright)]">
                      New
                    </span>
                  )}
                </p>
                {!compact && (
                  <p className="gm-muted mt-1 text-sm leading-relaxed">{alert.body}</p>
                )}
                <p className="gm-muted mt-1 text-xs">
                  {when(alert.createdAt)}
                  {alert.amount !== null && (
                    <> · {formatMoney(toCents(alert.amount))}</>
                  )}
                </p>
              </div>
            </div>
          </>
        );

        return (
          <li key={alert.id}>
            {alert.href ? (
              <Link href={alert.href} className="block rounded-lg transition hover:opacity-80">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
