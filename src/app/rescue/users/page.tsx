import { requireTenant, tenantMembers } from "@/lib/rescue/tenant";
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLES } from "@/lib/rescue/permissions";
import { MemberForms } from "./MemberForms";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const context = await requireTenant();
  const members = await tenantMembers(context.tenant.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-3xl font-semibold">Users</h1>
        <p className="gm-muted mt-1 text-sm">
          Who can see this workspace, and what each of them may do. New members start with the least
          privilege that is useful.
        </p>
      </div>

      <MemberForms
        canManage={context.can("manage_members")}
        roles={ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
        members={members.map((member) => ({
          membershipId: member.membershipId,
          name: member.name,
          email: member.email,
          role: member.role,
          roleLabel: ROLE_LABEL[member.role],
          isSelf: member.userId === context.viewer.id,
        }))}
      />

      <section className="gm-card">
        <h2 className="font-semibold">What the roles mean</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {ROLES.map((role) => (
            <div key={role} className="flex flex-wrap gap-2">
              <dt className="w-24 shrink-0 font-semibold">{ROLE_LABEL[role]}</dt>
              <dd className="gm-muted flex-1">{ROLE_DESCRIPTION[role]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
