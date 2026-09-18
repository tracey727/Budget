"use client";

import { useActionState } from "react";
import { createWorkspaceAction } from "@/lib/rescue/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";

export function StartForm({ timezones }: { timezones: string[] }) {
  const [state, action] = useActionState(createWorkspaceAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <Notice state={state} />

      <div>
        <label className="gm-label" htmlFor="name">
          Practice name
        </label>
        <input id="name" name="name" className="gm-input" required maxLength={120} placeholder="Example Allied Health" />
      </div>

      <div>
        <label className="gm-label" htmlFor="timezone">
          Timezone
        </label>
        <select id="timezone" name="timezone" className="gm-input" defaultValue="Australia/Sydney">
          {timezones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace("Australia/", "")}
            </option>
          ))}
        </select>
        <p className="gm-muted mt-1 text-xs">
          Timestamps in your exports that carry no timezone are read in this one. Currency is AUD.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="withDemo" className="mt-1" defaultChecked />
        <span>
          Start with demonstration data
          <span className="gm-muted block text-xs">
            Synthetic records only. Every screen is labelled while it is in use, and you can add your own
            exports at any time.
          </span>
        </span>
      </label>

      <SubmitButton pendingLabel="Creating…">Create workspace</SubmitButton>
    </form>
  );
}
