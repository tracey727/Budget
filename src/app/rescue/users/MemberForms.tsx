"use client";

import { useActionState } from "react";
import { addMemberAction, changeRoleAction, removeMemberAction } from "@/lib/rescue/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";

export function MemberForms({
  canManage,
  roles,
  members,
}: {
  canManage: boolean;
  roles: { value: string; label: string }[];
  members: {
    membershipId: string;
    name: string;
    email: string;
    role: string;
    roleLabel: string;
    isSelf: boolean;
  }[];
}) {
  const [addState, add] = useActionState(addMemberAction, undefined);
  const [roleState, changeRole] = useActionState(changeRoleAction, undefined);
  const [removeState, remove] = useActionState(removeMemberAction, undefined);

  return (
    <div className="space-y-6">
      {canManage && (
        <form action={add} className="gm-card space-y-3">
          <h2 className="font-semibold">Add someone</h2>
          <Notice state={addState} />
          <p className="gm-muted text-sm">
            They need an account already. Access is granted to accounts that exist rather than by emailing a
            link around.
          </p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <div>
              <label className="gm-label" htmlFor="email">
                Email address
              </label>
              <input id="email" name="email" type="email" className="gm-input" required />
            </div>
            <div>
              <label className="gm-label" htmlFor="role">
                Role
              </label>
              <select id="role" name="role" className="gm-input" defaultValue="reviewer">
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
          </div>
        </form>
      )}

      <section>
        <Notice state={roleState} />
        <Notice state={removeState} />
        <div className="gm-scroll-x">
          <table className="gm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {canManage && <th className="text-right">Change</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.membershipId}>
                  <td>
                    {member.name}
                    {member.isSelf && <span className="gm-muted ml-2 text-xs">(you)</span>}
                  </td>
                  <td className="gm-muted text-sm">{member.email}</td>
                  <td>{member.roleLabel}</td>
                  {canManage && (
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <form action={changeRole} className="flex items-center gap-1.5">
                          <input type="hidden" name="membershipId" value={member.membershipId} />
                          <label className="sr-only" htmlFor={`role-${member.membershipId}`}>
                            Role for {member.name}
                          </label>
                          <select
                            id={`role-${member.membershipId}`}
                            name="role"
                            defaultValue={member.role}
                            className="gm-input py-1 text-xs"
                          >
                            {roles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <SubmitButton className="gm-btn-secondary text-xs" pendingLabel="…">
                            Save
                          </SubmitButton>
                        </form>

                        <form action={remove}>
                          <input type="hidden" name="membershipId" value={member.membershipId} />
                          <SubmitButton className="gm-btn-secondary text-xs" pendingLabel="…">
                            Remove
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
