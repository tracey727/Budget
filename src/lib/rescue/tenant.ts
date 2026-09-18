/**
 * Tenant context.
 *
 * The single most important rule in this product: a tenant ID coming from a
 * client is never trusted on its own. Every request resolves the tenant by
 * looking up the signed-in user's active memberships and taking the intersection
 * with what was asked for. A cookie can only *choose between* workspaces the
 * person already belongs to; it can never grant one.
 */

import { cookies } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rrMemberships, rrTenants, users, type RrTenant } from "@/lib/db/schema";
import { requireUser, type Viewer } from "@/lib/auth/require";
import { can, isRole, type Capability } from "./permissions";
import { mergeSettings } from "./settings";
import type { Role, RuleSettings } from "./types";

export const TENANT_COOKIE = "rr_tenant";

/** Australian timezones a workspace may declare. Deliberately explicit. */
export const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Hobart",
  "Australia/Darwin",
];

export type TenantSummary = { tenant: RrTenant; role: Role };

export type TenantContext = {
  viewer: Viewer;
  tenant: RrTenant;
  role: Role;
  settings: RuleSettings;
  /** Every workspace this person belongs to, for the switcher. */
  available: TenantSummary[];
  can: (capability: Capability) => boolean;
};

/** Merges stored tenant settings over the defaults, ignoring anything unknown. */
export function settingsFor(tenant: Pick<RrTenant, "settingsJson">): RuleSettings {
  return mergeSettings(tenant.settingsJson);
}

/** Workspaces this user actually belongs to. Nothing else is ever visible. */
export async function membershipsFor(userId: string): Promise<TenantSummary[]> {
  const rows = await db()
    .select({ tenant: rrTenants, role: rrMemberships.role })
    .from(rrMemberships)
    .innerJoin(rrTenants, eq(rrMemberships.tenantId, rrTenants.id))
    .where(and(eq(rrMemberships.userId, userId), eq(rrMemberships.status, "active")))
    .orderBy(asc(rrTenants.name));

  return rows
    .filter((row) => row.tenant.status === "active" && isRole(row.role))
    .map((row) => ({ tenant: row.tenant, role: row.role as Role }));
}

/**
 * Resolves the active workspace for this request.
 *
 * Returns null when the person belongs to none, which the layout turns into the
 * "create a workspace" screen rather than an error.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const viewer = await requireUser("/rescue");
  const available = await membershipsFor(viewer.id);
  if (available.length === 0) return null;

  const store = await cookies();
  const requested = store.get(TENANT_COOKIE)?.value;

  // The cookie only selects among memberships; it cannot introduce one.
  const chosen = available.find((entry) => entry.tenant.id === requested) ?? available[0];

  return {
    viewer,
    tenant: chosen.tenant,
    role: chosen.role,
    settings: settingsFor(chosen.tenant),
    available,
    can: (capability: Capability) => can(chosen.role, capability),
  };
}

/** For pages: sends someone with no workspace to the place that makes one. */
export async function requireTenant(): Promise<TenantContext> {
  const context = await getTenantContext();
  if (!context) redirect("/rescue/start");
  return context;
}

/**
 * For server actions and API routes.
 *
 * Throws rather than redirects, and refuses the capability rather than the
 * route — an action must fail closed even if a page somehow rendered a button
 * the role should not have seen.
 */
export async function requireCapability(capability: Capability): Promise<TenantContext> {
  const context = await getTenantContext();
  if (!context) throw new Error("No workspace is selected.");
  if (!context.can(capability)) {
    throw new Error(`Your role (${context.role}) is not permitted to do that.`);
  }
  return context;
}

/** Display names for assignment dropdowns, scoped to the workspace. */
export async function tenantMembers(tenantId: string): Promise<
  { userId: string; name: string; email: string; role: Role; status: string; membershipId: string }[]
> {
  const rows = await db()
    .select({
      membershipId: rrMemberships.id,
      userId: users.id,
      name: users.fullName,
      email: users.email,
      role: rrMemberships.role,
      status: rrMemberships.status,
    })
    .from(rrMemberships)
    .innerJoin(users, eq(rrMemberships.userId, users.id))
    .where(eq(rrMemberships.tenantId, tenantId))
    .orderBy(asc(users.fullName));

  return rows.map((row) => ({ ...row, role: (isRole(row.role) ? row.role : "reviewer") as Role }));
}
