"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { rrMemberships, rrTenants, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { recordAudit } from "@/lib/rescue/audit";
import { seedDemoData } from "@/lib/rescue/demo";
import { isRole } from "@/lib/rescue/permissions";
import { membershipsFor, requireCapability, TENANT_COOKIE, TIMEZONES } from "@/lib/rescue/tenant";
import { DEFAULT_RULE_SETTINGS } from "@/lib/rescue/types";

import type { FormState } from "./types";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || "workspace"}-${suffix}`;
}

const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Give the workspace a name.").max(120, "That name is too long."),
  timezone: z.string().refine((value) => TIMEZONES.includes(value), "Choose an Australian timezone."),
});

/** Creates a workspace and makes the person who created it its owner. */
export async function createWorkspaceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireUser("/rescue");

  const parsed = workspaceSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    timezone: String(formData.get("timezone") ?? "Australia/Sydney"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const withDemo = formData.get("withDemo") === "on";

  const created = await db()
    .insert(rrTenants)
    .values({
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      timezone: parsed.data.timezone,
      settingsJson: DEFAULT_RULE_SETTINGS,
      isDemo: withDemo,
    })
    .returning({ id: rrTenants.id });

  const tenantId = created[0].id;

  await db().insert(rrMemberships).values({ tenantId, userId: viewer.id, role: "owner", status: "active" });

  await recordAudit({
    tenantId,
    actorUserId: viewer.id,
    eventType: "tenant.created",
    entityType: "tenant",
    entityId: tenantId,
    metadata: { name: parsed.data.name, timezone: parsed.data.timezone, demo: withDemo },
  });

  if (withDemo) {
    await seedDemoData(tenantId);
    await recordAudit({
      tenantId,
      actorUserId: viewer.id,
      eventType: "demo.seeded",
      entityType: "tenant",
      entityId: tenantId,
      metadata: { note: "Synthetic demonstration data. No real client information." },
    });
  }

  const store = await cookies();
  store.set(TENANT_COOKIE, tenantId, { httpOnly: true, sameSite: "lax", path: "/" });

  redirect("/rescue");
}

/** Switching workspaces only ever chooses between existing memberships. */
export async function switchWorkspaceAction(formData: FormData): Promise<void> {
  const viewer = await requireUser("/rescue");
  const requested = String(formData.get("tenantId") ?? "");

  const available = await membershipsFor(viewer.id);
  if (!available.some((entry) => entry.tenant.id === requested)) {
    // Not an error worth explaining — the person simply has no such workspace.
    redirect("/rescue");
  }

  const store = await cookies();
  store.set(TENANT_COOKIE, requested, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/rescue");
}

const settingsSchema = z.object({
  refillLeadHours: z.coerce.number().int().min(0).max(720),
  lateCancellationHours: z.coerce.number().int().min(0).max(720),
  invoiceGraceDays: z.coerce.number().int().min(0).max(180),
  followUpLookbackDays: z.coerce.number().int().min(1).max(365),
  referralProgressDays: z.coerce.number().int().min(1).max(365),
  duplicateInvoiceWindowDays: z.coerce.number().int().min(0).max(90),
  revenueTaskTypes: z.string().trim().min(1, "List at least one task type."),
});

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("manage_settings");

  const parsed = settingsSchema.safeParse({
    refillLeadHours: formData.get("refillLeadHours"),
    lateCancellationHours: formData.get("lateCancellationHours"),
    invoiceGraceDays: formData.get("invoiceGraceDays"),
    followUpLookbackDays: formData.get("followUpLookbackDays"),
    referralProgressDays: formData.get("referralProgressDays"),
    duplicateInvoiceWindowDays: formData.get("duplicateInvoiceWindowDays"),
    revenueTaskTypes: String(formData.get("revenueTaskTypes") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the thresholds." };

  const settings = {
    ...parsed.data,
    revenueTaskTypes: parsed.data.revenueTaskTypes
      .split(",")
      .map((value) => value.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean),
  };

  await db()
    .update(rrTenants)
    .set({ settingsJson: settings, updatedAt: new Date() })
    .where(eq(rrTenants.id, context.tenant.id));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "tenant.settings_updated",
    entityType: "tenant",
    entityId: context.tenant.id,
    metadata: { settings },
  });

  revalidatePath("/rescue/settings");
  return { ok: true, message: "Thresholds saved. They apply from the next detection run." };
}

const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the person's email address."),
  role: z.string().refine(isRole, "Choose a role."),
});

/**
 * Adds an existing account to the workspace.
 *
 * Deliberately no invitation-by-email in V1: access is granted to accounts that
 * already exist, which keeps the number of ways into a practice's data small.
 */
export async function addMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("manage_members");

  const parsed = memberSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const found = await db()
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data.email}`)
    .limit(1);

  const user = found[0];
  if (!user) {
    return {
      error: "No account with that email address. Ask them to sign up first, then add them here.",
    };
  }

  await db()
    .insert(rrMemberships)
    .values({ tenantId: context.tenant.id, userId: user.id, role: parsed.data.role, status: "active" })
    .onConflictDoUpdate({
      target: [rrMemberships.tenantId, rrMemberships.userId],
      set: { role: parsed.data.role, status: "active" },
    });

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "membership.created",
    entityType: "membership",
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/rescue/users");
  return { ok: true, message: `${parsed.data.email} can now sign in to this workspace.` };
}

const roleChangeSchema = z.object({
  membershipId: z.string().uuid(),
  role: z.string().refine(isRole, "Choose a role."),
});

export async function changeRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("manage_members");

  const parsed = roleChangeSchema.safeParse({
    membershipId: String(formData.get("membershipId") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  // Tenant-scoped: a membership ID from another workspace matches nothing.
  const rows = await db()
    .select({ userId: rrMemberships.userId, role: rrMemberships.role })
    .from(rrMemberships)
    .where(and(eq(rrMemberships.id, parsed.data.membershipId), eq(rrMemberships.tenantId, context.tenant.id)))
    .limit(1);

  const membership = rows[0];
  if (!membership) return { error: "That member is not part of this workspace." };

  if (membership.role === "owner" && parsed.data.role !== "owner") {
    const owners = await db()
      .select({ count: sql<string>`count(*)` })
      .from(rrMemberships)
      .where(
        and(
          eq(rrMemberships.tenantId, context.tenant.id),
          eq(rrMemberships.role, "owner"),
          eq(rrMemberships.status, "active"),
        ),
      );
    if (Number(owners[0]?.count ?? 0) <= 1) {
      return { error: "A workspace must keep at least one owner. Make someone else an owner first." };
    }
  }

  await db()
    .update(rrMemberships)
    .set({ role: parsed.data.role })
    .where(and(eq(rrMemberships.id, parsed.data.membershipId), eq(rrMemberships.tenantId, context.tenant.id)));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "membership.updated",
    entityType: "membership",
    entityId: parsed.data.membershipId,
    metadata: { from: membership.role, to: parsed.data.role },
  });

  revalidatePath("/rescue/users");
  return { ok: true, message: "Role updated." };
}

export async function removeMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("manage_members");
  const membershipId = String(formData.get("membershipId") ?? "");

  const rows = await db()
    .select({ userId: rrMemberships.userId, role: rrMemberships.role })
    .from(rrMemberships)
    .where(and(eq(rrMemberships.id, membershipId), eq(rrMemberships.tenantId, context.tenant.id)))
    .limit(1);

  const membership = rows[0];
  if (!membership) return { error: "That member is not part of this workspace." };

  if (membership.role === "owner") {
    const owners = await db()
      .select({ count: sql<string>`count(*)` })
      .from(rrMemberships)
      .where(
        and(
          eq(rrMemberships.tenantId, context.tenant.id),
          eq(rrMemberships.role, "owner"),
          eq(rrMemberships.status, "active"),
          ne(rrMemberships.id, membershipId),
        ),
      );
    if (Number(owners[0]?.count ?? 0) === 0) {
      return { error: "That is the last owner. Make someone else an owner before removing them." };
    }
  }

  await db()
    .delete(rrMemberships)
    .where(and(eq(rrMemberships.id, membershipId), eq(rrMemberships.tenantId, context.tenant.id)));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "membership.removed",
    entityType: "membership",
    entityId: membershipId,
    metadata: { role: membership.role },
  });

  revalidatePath("/rescue/users");
  return { ok: true, message: "Member removed." };
}

/** Adds the synthetic demonstration data to the current workspace. */
export async function seedDemoAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const context = await requireCapability("import");

  await seedDemoData(context.tenant.id);
  await db().update(rrTenants).set({ isDemo: true }).where(eq(rrTenants.id, context.tenant.id));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "demo.seeded",
    entityType: "tenant",
    entityId: context.tenant.id,
    metadata: { note: "Synthetic demonstration data. No real client information." },
  });

  revalidatePath("/rescue");
  revalidatePath("/rescue/imports");
  return { ok: true, message: "Demonstration data added. Run detection to see the findings." };
}

