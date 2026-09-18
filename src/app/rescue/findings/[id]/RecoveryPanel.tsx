"use client";

import { useActionState } from "react";
import { recordRecoveryAction, reverseRecoveryAction } from "@/lib/rescue/actions/findings";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";
import { formatMoney } from "@/lib/money";

/**
 * Confirming recovery.
 *
 * Confirmed money is never derived from an estimate — someone types what came
 * in, dates it, and says what the evidence is. Partial recoveries are expected;
 * the remaining headroom is shown so nothing is claimed twice.
 */
export function RecoveryPanel({
  findingId,
  held,
  estimatedCents,
  recoveredCents,
  recoveries,
}: {
  findingId: string;
  held: boolean;
  estimatedCents: number | null;
  recoveredCents: number;
  recoveries: { id: string; amount: string; date: string; isReversal: boolean }[];
}) {
  const [state, record] = useActionState(recordRecoveryAction, undefined);
  const [reverseState, reverse] = useActionState(reverseRecoveryAction, undefined);

  const remaining = estimatedCents === null ? null : Math.max(0, estimatedCents - recoveredCents);

  if (held) {
    return (
      <section className="gm-card space-y-2">
        <h2 className="font-semibold">Recovery</h2>
        <p className="gm-muted text-sm">
          This finding is on hold because its source data contradicts itself. A held finding cannot carry a
          recovery — correct the data and run detection again first.
        </p>
      </section>
    );
  }

  return (
    <section className="gm-card space-y-4">
      <h2 className="font-semibold">Record recovery</h2>

      {remaining !== null && (
        <p className="gm-muted text-sm">
          {recoveredCents > 0
            ? `${formatMoney(recoveredCents)} recorded so far. ${formatMoney(remaining)} of the estimate is left.`
            : `Up to ${formatMoney(remaining)} may be recorded against this finding's estimate.`}
        </p>
      )}

      <form action={record} className="space-y-3">
        <input type="hidden" name="findingId" value={findingId} />
        <Notice state={state} />

        <div>
          <label className="gm-label" htmlFor="amount">
            Amount recovered
          </label>
          <input id="amount" name="amount" className="gm-input" placeholder="252.99" required inputMode="decimal" />
        </div>

        <div>
          <label className="gm-label" htmlFor="recoveryDate">
            Date received
          </label>
          <input id="recoveryDate" name="recoveryDate" type="date" className="gm-input" required />
        </div>

        <div>
          <label className="gm-label" htmlFor="evidenceNote">
            Evidence
          </label>
          <input
            id="evidenceNote"
            name="evidenceNote"
            className="gm-input"
            placeholder="Receipt 4471, paid in full"
            required
            minLength={5}
          />
        </div>

        <SubmitButton pendingLabel="Recording…">Confirm recovery</SubmitButton>
      </form>

      {recoveries.length > 0 && (
        <>
          <div className="gm-rule" />
          <Notice state={reverseState} />
          <ul className="space-y-2 text-sm">
            {recoveries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2">
                <span>
                  {entry.amount} · {entry.date}
                  {entry.isReversal && <span className="gm-muted ml-1 text-xs">reversal</span>}
                </span>
                {!entry.isReversal && (
                  <form action={reverse} className="flex items-center gap-1.5">
                    <input type="hidden" name="recoveryId" value={entry.id} />
                    <input
                      name="reasonNote"
                      className="gm-input py-1 text-xs"
                      placeholder="Why reverse it?"
                      required
                      minLength={5}
                    />
                    <SubmitButton className="gm-btn-secondary text-xs" pendingLabel="…">
                      Reverse
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
