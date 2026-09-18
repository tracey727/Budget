"use client";

import { useActionState } from "react";
import { seedDemoAction } from "@/lib/rescue/actions/workspace";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";

export function SeedDemo() {
  const [state, action] = useActionState(seedDemoAction, undefined);

  return (
    <div className="space-y-2">
      <form action={action}>
        <SubmitButton className="gm-btn-secondary" pendingLabel="Adding…">
          Load demonstration data
        </SubmitButton>
      </form>
      <Notice state={state} />
    </div>
  );
}
