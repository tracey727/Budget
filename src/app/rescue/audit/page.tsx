import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rrAuditEvents, users } from "@/lib/db/schema";
import { requireTenant } from "@/lib/rescue/tenant";
import { AUDIT_LABEL } from "@/lib/rescue/audit";
import { formatInstant } from "@/lib/rescue/time";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const context = await requireTenant();

  if (!context.can("view_audit")) {
    return (
      <div className="space-y-4">
        <h1 className="gm-display text-3xl font-semibold">Audit</h1>
        <p className="gm-alert-warn text-sm">
          Your role cannot see the audit trail. Owners, admins, managers and auditors can.
        </p>
      </div>
    );
  }

  const { type } = await searchParams;

  const conditions = [eq(rrAuditEvents.tenantId, context.tenant.id)];
  if (type) conditions.push(eq(rrAuditEvents.eventType, type));

  const rows = await db()
    .select({ event: rrAuditEvents, actor: users.fullName, actorEmail: users.email })
    .from(rrAuditEvents)
    .leftJoin(users, eq(rrAuditEvents.actorUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(rrAuditEvents.createdAt))
    .limit(250);

  const types = [...new Set(rows.map((row) => row.event.eventType))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="gm-display text-3xl font-semibold">Audit</h1>
          <p className="gm-muted mt-1 text-sm">
            Every material change, in order, with who made it. Read-only by design — entries are never
            edited or removed.
          </p>
        </div>
        {context.can("export") && (
          <Link
            href="/api/rescue/exports/audit"
            prefetch={false}
            className="gm-muted text-sm hover:text-brand-600"
          >
            Export as CSV →
          </Link>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <label className="gm-label" htmlFor="type">
            Event type
          </label>
          <select id="type" name="type" defaultValue={type ?? ""} className="gm-input">
            <option value="">Everything</option>
            {types.map((eventType) => (
              <option key={eventType} value={eventType}>
                {AUDIT_LABEL[eventType] ?? eventType}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="gm-btn-secondary">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="gm-muted text-sm">Nothing recorded yet.</p>
      ) : (
        <div className="gm-scroll-x">
          <table className="gm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>Who</th>
                <th>Record</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, actor, actorEmail }) => (
                <tr key={event.id}>
                  <td className="gm-muted whitespace-nowrap text-xs">
                    {formatInstant(event.createdAt, context.tenant.timezone)}
                  </td>
                  <td>{AUDIT_LABEL[event.eventType] ?? event.eventType}</td>
                  <td className="text-sm">
                    {actor ?? "System"}
                    {actorEmail && <span className="gm-muted block text-xs">{actorEmail}</span>}
                  </td>
                  <td className="gm-muted font-mono text-[10px]">
                    {event.entityType}
                    {event.entityId ? ` ${event.entityId.slice(0, 8)}…` : ""}
                  </td>
                  <td className="gm-muted max-w-sm truncate text-xs" title={JSON.stringify(event.metadataJson)}>
                    {JSON.stringify(event.metadataJson)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
