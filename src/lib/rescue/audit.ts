/**
 * The audit trail.
 *
 * Every material mutation writes one row here: who, what, which record, when.
 * It is append-only by convention and by the absence of any update or delete
 * path in the product — if something needs correcting, a later event says so.
 */

import { db } from "@/lib/db";
import { rrAuditEvents } from "@/lib/db/schema";

export type AuditEventType =
  | "tenant.created"
  | "tenant.settings_updated"
  | "membership.created"
  | "membership.updated"
  | "membership.removed"
  | "import.created"
  | "import.mapped"
  | "import.validated"
  | "import.committed"
  | "import.deleted"
  | "rules.run"
  | "finding.status_changed"
  | "finding.hold"
  | "finding.dismissed"
  | "action.created"
  | "action.assigned"
  | "action.updated"
  | "recovery.recorded"
  | "recovery.reversed"
  | "export.generated"
  | "demo.seeded";

export async function recordAudit(input: {
  tenantId: string;
  actorUserId: string | null;
  eventType: AuditEventType;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db()
    .insert(rrAuditEvents)
    .values({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadataJson: input.metadata ?? {},
    });
}

export const AUDIT_LABEL: Record<string, string> = {
  "tenant.created": "Workspace created",
  "tenant.settings_updated": "Settings changed",
  "membership.created": "Member added",
  "membership.updated": "Member role changed",
  "membership.removed": "Member removed",
  "import.created": "File uploaded",
  "import.mapped": "Mapping saved",
  "import.validated": "Rows validated",
  "import.committed": "Import committed",
  "import.deleted": "Import discarded",
  "rules.run": "Detection run",
  "finding.status_changed": "Finding status changed",
  "finding.hold": "Finding placed on hold",
  "finding.dismissed": "Finding dismissed",
  "action.created": "Action recorded",
  "action.assigned": "Action assigned",
  "action.updated": "Action updated",
  "recovery.recorded": "Recovery confirmed",
  "recovery.reversed": "Recovery reversed",
  "export.generated": "Export generated",
  "demo.seeded": "Demonstration data created",
};
