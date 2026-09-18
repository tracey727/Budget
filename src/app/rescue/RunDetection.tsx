"use client";

import { useActionState } from "react";
import { runDetectionAction } from "@/lib/rescue/actions/imports";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";

/**
 * Running the rule pack.
 *
 * Safe to press twice: a re-run updates the findings it already raised rather
 * than creating a second copy of each.
 */
export function RunDetection({ ruleId }: { ruleId?: string }) {
  const [state, action] = useActionState(runDetectionAction, undefined);

  return (
    <div className="space-y-2">
      <form action={action}>
        {ruleId && <input type="hidden" name="ruleId" value={ruleId} />}
        <SubmitButton pendingLabel="Running detection…">
          {ruleId ? "Run this rule" : "Run detection"}
        </SubmitButton>
      </form>
      <Notice state={state} />
    </div>
  );
}
