/**
 * Roles and what each one may do.
 *
 * Least privilege, and the default for a new member is the weakest useful role.
 * Everything that changes money, dismisses a finding or exports data is
 * separated from everything that merely looks, because those are the actions a
 * practice will be asked about later.
 */

import type { Role } from "./types";

export type Capability =
  | "view" // see findings, the queue and the dashboard
  | "import" // upload and commit operational data
  | "run_rules"
  | "assign" // assign work and set due dates
  | "progress" // move an action along, put a finding on hold
  | "dismiss" // close a finding without recovery — always with a reason
  | "record_recovery"
  | "export"
  | "view_audit"
  | "manage_members"
  | "manage_settings";

const MATRIX: Record<Role, Capability[]> = {
  owner: [
    "view", "import", "run_rules", "assign", "progress", "dismiss",
    "record_recovery", "export", "view_audit", "manage_members", "manage_settings",
  ],
  admin: [
    "view", "import", "run_rules", "assign", "progress", "dismiss",
    "record_recovery", "export", "view_audit", "manage_members", "manage_settings",
  ],
  manager: [
    "view", "import", "run_rules", "assign", "progress", "dismiss",
    "record_recovery", "export", "view_audit",
  ],
  // A reviewer works the queue but cannot close money questions.
  reviewer: ["view", "assign", "progress"],
  // An auditor reads everything and changes nothing.
  auditor: ["view", "export", "view_audit"],
};

export const ROLES: Role[] = ["owner", "admin", "manager", "reviewer", "auditor"];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  reviewer: "Reviewer",
  auditor: "Auditor",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Full control, including members and settings. There is always at least one.",
  admin: "Everything an owner can do, day to day.",
  manager: "Runs the queue: imports, detection, dismissals and confirmed recovery.",
  reviewer: "Works assigned findings. Cannot dismiss or confirm recovery.",
  auditor: "Read-only, including the audit trail. Changes nothing.",
};

export function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value);
}

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

/** Message shown when a capability is refused, in the person's own terms. */
export function refusal(role: Role, capability: Capability): string {
  const what: Record<Capability, string> = {
    view: "see this",
    import: "import data",
    run_rules: "run detection",
    assign: "assign work",
    progress: "change an action",
    dismiss: "dismiss a finding",
    record_recovery: "record recovery",
    export: "export data",
    view_audit: "see the audit trail",
    manage_members: "manage members",
    manage_settings: "change settings",
  };
  return `Your role (${ROLE_LABEL[role]}) cannot ${what[capability]}. Ask an owner or admin if you need to.`;
}
