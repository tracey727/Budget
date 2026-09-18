/**
 * Where a transaction has got to at the bank.
 *
 * The distinction matters more than it looks: a pending row has already been
 * taken out of what is safe to spend, but the bank can still change the amount
 * or release it entirely, so it is never treated as settled.
 */
export function StatusBadge({
  status,
  pendingSince,
}: {
  status: string;
  /** Shown as "held 2 days" so a stuck authorisation is obvious. */
  pendingSince?: Date | null;
}) {
  if (status === "pending") {
    const days = pendingSince
      ? Math.floor((Date.now() - pendingSince.getTime()) / 86_400_000)
      : null;
    return (
      <span className="gm-pill-pending" title="Authorised by your bank, not settled yet">
        Pending
        {days !== null && days > 0 ? ` · ${days}d` : ""}
      </span>
    );
  }

  if (status === "declined") {
    return (
      <span className="gm-pill-dropped" title="The bank released this hold without settling it">
        Released
      </span>
    );
  }

  return null;
}

/** The explicit "this money has settled" marker, used where it earns its space. */
export function ClearedBadge() {
  return <span className="gm-pill-cleared">Cleared</span>;
}
