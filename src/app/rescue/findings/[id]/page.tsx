import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { rrAuditEvents, users } from "@/lib/db/schema";
import { requireTenant, tenantMembers } from "@/lib/rescue/tenant";
import { findingDetail } from "@/lib/rescue/queries";
import { formatMoney } from "@/lib/money";
import { asBand, asValueBasis, centsOf } from "@/lib/rescue/types";
import { CONFIDENCE_LABEL, DISMISS_REASON_LABEL, FINDING_STATUS_LABEL } from "@/lib/rescue/labels";
import { AUDIT_LABEL } from "@/lib/rescue/audit";
import { formatInstant, formatInstantDate } from "@/lib/rescue/time";
import { BandBadge, ValueWithBasis } from "@/components/rescue/Band";
import { ActionPanel } from "./ActionPanel";
import { RecoveryPanel } from "./RecoveryPanel";
import { DismissPanel } from "./DismissPanel";

export const dynamic = "force-dynamic";

export default async function FindingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireTenant();
  const { id } = await params;

  const detail = await findingDetail(context.tenant.id, id);
  if (!detail) notFound();

  const { finding, rule, evidence, action, recoveries, recoveredCents, dismissal } = detail;
  const estimatedCents = centsOf(finding.estimatedValue);
  const members = await tenantMembers(context.tenant.id);

  const history = await db()
    .select({ event: rrAuditEvents, actor: users.fullName })
    .from(rrAuditEvents)
    .leftJoin(users, eq(rrAuditEvents.actorUserId, users.id))
    .where(
      and(
        eq(rrAuditEvents.tenantId, context.tenant.id),
        or(eq(rrAuditEvents.entityId, finding.id), eq(rrAuditEvents.entityType, "finding"))!,
      ),
    )
    .orderBy(desc(rrAuditEvents.createdAt))
    .limit(40);

  const ownHistory = history.filter((row) => row.event.entityId === finding.id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/rescue/queue" className="gm-muted text-sm hover:text-brand-600">
          ← Action queue
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="gm-display text-3xl font-semibold">{finding.title}</h1>
            <p className="gm-muted mt-1 text-sm">
              {finding.ruleId} v{finding.ruleVersion} · {rule?.name ?? "Rule not in this build"} ·{" "}
              {FINDING_STATUS_LABEL[finding.status as never] ?? finding.status}
            </p>
          </div>
          <BandBadge band={asBand(finding.priorityBand)} score={finding.priorityScore} />
        </div>
      </div>

      {finding.status === "hold" && finding.holdReason && (
        <p className="gm-alert-warn text-sm">
          <strong>On hold.</strong> {finding.holdReason} Nothing is claimed from this finding, and it cannot
          carry a recovery, until the source data is corrected and detection runs again.
        </p>
      )}

      {dismissal && (
        <p className="gm-alert text-sm">
          <strong>Dismissed</strong> by {dismissal.byName ?? "a former member"} on{" "}
          {formatInstantDate(dismissal.dismissal.createdAt, context.tenant.timezone)} —{" "}
          {DISMISS_REASON_LABEL[dismissal.dismissal.reasonCode] ?? dismissal.dismissal.reasonCode}:{" "}
          {dismissal.dismissal.reasonNote}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="gm-card space-y-4">
            <h2 className="font-semibold">What was found</h2>
            <p className="text-sm leading-relaxed">{finding.explanation}</p>

            <div className="gm-rule" />

            <div>
              <h3 className="gm-muted text-xs font-semibold uppercase tracking-wide">How the number was worked out</h3>
              <p className="mt-1 text-sm">{finding.calculation}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <ValueWithBasis cents={estimatedCents} basis={asValueBasis(finding.valueBasis)} />
              <span className="gm-muted text-xs">
                {CONFIDENCE_LABEL[finding.confidence as never] ?? finding.confidence}
              </span>
              {recoveredCents !== 0 && (
                <span className="text-sm">
                  <strong>{formatMoney(recoveredCents)}</strong>{" "}
                  <span className="gm-muted text-xs uppercase tracking-wide">confirmed recovered</span>
                </span>
              )}
            </div>

            <div>
              <h3 className="gm-muted text-xs font-semibold uppercase tracking-wide">Why this priority</h3>
              <p className="mt-1 text-sm">{finding.priorityRationale}</p>
            </div>
          </section>

          <section className="gm-card space-y-3">
            <h2 className="font-semibold">Evidence</h2>
            <p className="gm-muted text-sm">
              Taken from your own imported records. Nothing below was inferred.
            </p>
            {evidence.length === 0 ? (
              <p className="gm-muted text-sm">No evidence was attached to this finding.</p>
            ) : (
              <ul className="space-y-3">
                {evidence.map((item) => (
                  <li key={item.id} className="rr-evidence">
                    <p className="font-semibold">{item.label}</p>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                      {Object.entries((item.evidenceJson ?? {}) as Record<string, unknown>).map(
                        ([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <dt className="gm-muted">{key.replace(/_/g, " ")}:</dt>
                            <dd>{value === null || value === "" ? "—" : String(value)}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
            <p className="gm-muted text-xs">
              Rule {finding.ruleId} version {finding.ruleVersion}, logic {finding.ruleLogicHash}. First seen{" "}
              {formatInstant(finding.firstDetectedAt, context.tenant.timezone)}, last confirmed{" "}
              {formatInstant(finding.lastDetectedAt, context.tenant.timezone)}.
            </p>
          </section>

          <section className="gm-card space-y-3">
            <h2 className="font-semibold">Recovery history</h2>
            {recoveries.length === 0 ? (
              <p className="gm-muted text-sm">Nothing recovered against this finding yet.</p>
            ) : (
              <table className="gm-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                    <th>Evidence</th>
                    <th>Confirmed by</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveries.map(({ event, confirmedByName }) => (
                    <tr key={event.id}>
                      <td>{formatInstantDate(`${event.recoveryDate}T00:00:00Z`, "UTC")}</td>
                      <td className="text-right font-semibold">{formatMoney(centsOf(event.amount) ?? 0)}</td>
                      <td className="text-sm">{event.evidenceNote}</td>
                      <td className="gm-muted text-sm">{confirmedByName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="gm-muted text-xs">
              Recovery entries are never edited. A correction is posted as a reversal, so the history always
              shows what was claimed and when.
            </p>
          </section>

          <section className="gm-card space-y-3">
            <h2 className="font-semibold">Action history</h2>
            {ownHistory.length === 0 ? (
              <p className="gm-muted text-sm">Nothing has happened to this finding yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ownHistory.map((row) => (
                  <li key={row.event.id} className="flex flex-wrap gap-2">
                    <span className="gm-muted text-xs">
                      {formatInstant(row.event.createdAt, context.tenant.timezone)}
                    </span>
                    <span>{AUDIT_LABEL[row.event.eventType] ?? row.event.eventType}</span>
                    <span className="gm-muted text-xs">{row.actor ?? "system"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <ActionPanel
            findingId={finding.id}
            status={finding.status}
            canAssign={context.can("assign")}
            canProgress={context.can("progress")}
            members={members.map((member) => ({ id: member.userId, name: member.name }))}
            current={
              action
                ? {
                    assignedTo: action.action.assignedTo,
                    dueAt: action.action.dueAt ? action.action.dueAt.toISOString().slice(0, 10) : "",
                    nextAction: action.action.nextAction ?? "",
                    status: action.action.status,
                  }
                : null
            }
          />

          {context.can("record_recovery") && (
            <RecoveryPanel
              findingId={finding.id}
              held={finding.priorityBand === "hold" || finding.confidence === "hold"}
              estimatedCents={estimatedCents}
              recoveredCents={recoveredCents}
              recoveries={recoveries.map(({ event }) => ({
                id: event.id,
                amount: formatMoney(centsOf(event.amount) ?? 0),
                date: event.recoveryDate,
                isReversal: Boolean(event.reversalOfId),
              }))}
            />
          )}

          {context.can("dismiss") && finding.status !== "dismissed" && (
            <DismissPanel findingId={finding.id} />
          )}
        </div>
      </div>
    </div>
  );
}
