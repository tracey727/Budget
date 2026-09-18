"use client";

import { switchWorkspaceAction } from "@/lib/rescue/actions/workspace";

/**
 * Switching workspaces.
 *
 * The select posts a tenant ID, and the server checks it against this person's
 * memberships before honouring it — the control is a convenience, never the
 * thing that grants access.
 */
export function WorkspaceSwitcher({
  current,
  options,
}: {
  current: string;
  options: { id: string; name: string }[];
}) {
  if (options.length <= 1) {
    return <span className="gm-muted hidden text-sm sm:inline">{options[0]?.name}</span>;
  }

  return (
    <form action={switchWorkspaceAction}>
      <label className="sr-only" htmlFor="tenantId">
        Workspace
      </label>
      <select
        id="tenantId"
        name="tenantId"
        defaultValue={current}
        className="gm-input py-1 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="gm-btn-secondary ml-2 text-sm">
          Switch
        </button>
      </noscript>
    </form>
  );
}
