import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { asBand, asValueBasis, centsOf } from "@/lib/rescue/types";
import { FINDING_STATUS_LABEL } from "@/lib/rescue/labels";
import { CONFIDENCE_LABEL } from "@/lib/rescue/labels";
import type { FindingRow } from "@/lib/rescue/queries";
import { BandBadge, ValueWithBasis } from "./Band";
import { formatInstantDate } from "@/lib/rescue/time";

function ageInDays(occurredAt: Date): number {
  return Math.max(0, Math.floor((Date.now() - occurredAt.getTime()) / 86_400_000));
}

export function FindingsTable({
  rows,
  timeZone,
  emptyMessage = "Nothing here.",
}: {
  rows: FindingRow[];
  timeZone: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="gm-muted mt-3 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="gm-scroll-x">
      <table className="gm-table">
        <thead>
          <tr>
            <th>Priority</th>
            <th>Finding</th>
            <th>Value</th>
            <th>Confidence</th>
            <th className="text-right">Age</th>
            <th>Owner</th>
            <th>Due</th>
            <th>Status</th>
            <th>Rule</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ finding, action, recoveredCents }) => {
            const band = asBand(finding.priorityBand);
            const due = action?.dueAt ?? null;
            const overdue = due !== null && due.getTime() < Date.now() && action?.status !== "done";

            return (
              <tr key={finding.id} className={band === "hold" ? "rr-row-hold" : undefined}>
                <td>
                  <BandBadge band={band} score={finding.priorityScore} />
                </td>
                <td className="max-w-md">
                  <Link href={`/rescue/findings/${finding.id}`} className="font-medium hover:text-brand-600">
                    {finding.title}
                  </Link>
                  {recoveredCents !== 0 && (
                    <span className="gm-muted block text-xs">
                      {formatMoney(recoveredCents)} recovered so far
                    </span>
                  )}
                </td>
                <td>
                  <ValueWithBasis
                    cents={centsOf(finding.estimatedValue)}
                    basis={asValueBasis(finding.valueBasis)}
                    className="text-sm"
                  />
                </td>
                <td className="gm-muted text-xs">{CONFIDENCE_LABEL[finding.confidence as never] ?? finding.confidence}</td>
                <td className="text-right text-sm">{ageInDays(finding.occurredAt)}d</td>
                <td className="text-sm">
                  {action?.assigneeName ?? <span className="gm-muted">Unassigned</span>}
                </td>
                <td className="text-sm">
                  {due ? (
                    <span className={overdue ? "text-[var(--bad)]" : undefined}>
                      {formatInstantDate(due, timeZone)}
                      {overdue && " · overdue"}
                    </span>
                  ) : (
                    <span className="gm-muted">—</span>
                  )}
                </td>
                <td className="text-sm">{FINDING_STATUS_LABEL[finding.status as never] ?? finding.status}</td>
                <td className="gm-muted font-mono text-xs">{finding.ruleId}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
