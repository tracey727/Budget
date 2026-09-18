"use client";

import { useActionState } from "react";
import { saveActionAction, setFindingStatusAction } from "@/lib/rescue/actions/findings";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";

/**
 * Assignment, due date, next action and status.
 *
 * Kept on one panel because they are one decision: who is doing what, by when.
 */
export function ActionPanel({
  findingId,
  status,
  canAssign,
  canProgress,
  members,
  current,
}: {
  findingId: string;
  status: string;
  canAssign: boolean;
  canProgress: boolean;
  members: { id: string; name: string }[];
  current: { assignedTo: string | null; dueAt: string; nextAction: string; status: string } | null;
}) {
  const [saveState, save] = useActionState(saveActionAction, undefined);
  const [statusState, changeStatus] = useActionState(setFindingStatusAction, undefined);

  return (
    <section className="gm-card space-y-4">
      <h2 className="font-semibold">Work this finding</h2>

      {canAssign ? (
        <form action={save} className="space-y-3">
          <input type="hidden" name="findingId" value={findingId} />
          <Notice state={saveState} />

          <div>
            <label className="gm-label" htmlFor="assignedTo">
              Owner
            </label>
            <select
              id="assignedTo"
              name="assignedTo"
              defaultValue={current?.assignedTo ?? ""}
              className="gm-input"
            >
              <option value="">Nobody yet</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="gm-label" htmlFor="dueAt">
              Due date
            </label>
            <input id="dueAt" name="dueAt" type="date" defaultValue={current?.dueAt ?? ""} className="gm-input" />
          </div>

          <div>
            <label className="gm-label" htmlFor="nextAction">
              Next action
            </label>
            <textarea
              id="nextAction"
              name="nextAction"
              rows={3}
              maxLength={500}
              defaultValue={current?.nextAction ?? ""}
              className="gm-input"
              placeholder="Ring the client about the outstanding balance."
            />
          </div>

          <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
        </form>
      ) : (
        <p className="gm-muted text-sm">Your role can see this finding but not assign it.</p>
      )}

      {canProgress && (
        <>
          <div className="gm-rule" />
          <form action={changeStatus} className="space-y-3">
            <input type="hidden" name="findingId" value={findingId} />
            <Notice state={statusState} />

            <div>
              <label className="gm-label" htmlFor="status">
                Status
              </label>
              <select id="status" name="status" defaultValue={status} className="gm-input">
                <option value="new">New</option>
                <option value="reviewing">Being reviewed</option>
                <option value="actioned">Actioned</option>
                <option value="hold">On hold</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="gm-label" htmlFor="note">
                Note (kept in the audit trail)
              </label>
              <input id="note" name="note" maxLength={500} className="gm-input" />
            </div>

            <SubmitButton className="gm-btn-secondary" pendingLabel="Updating…">
              Update status
            </SubmitButton>
          </form>
        </>
      )}
    </section>
  );
}
