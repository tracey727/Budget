/**
 * The pending → cleared pipeline.
 *
 * These are the cases that decide whether a person's balance is right: a hold
 * that settles under the same id, one that settles under a new id for a
 * different amount, one the bank abandons, and a genuinely new transaction
 * that merely looks similar to a pending one.
 */

import {
  reconcile,
  settlementScore,
  tokenise,
  DROP_AFTER_HOURS,
  MIN_SETTLEMENT_SCORE,
  type IncomingRow,
  type LedgerRow,
} from "../src/lib/bank/reconcile";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

const NOW = Date.parse("2026-03-10T09:00:00Z");
const ACCOUNT = "acct-1";

function ledger(over: Partial<LedgerRow> = {}): LedgerRow {
  return {
    id: "row-1",
    accountId: ACCOUNT,
    providerTransactionId: "prov-1",
    status: "pending",
    amountCents: -6430,
    description: "AMPOL FOODARY ALEXANDRIA",
    merchant: "Ampol",
    occurredOn: "2026-03-08",
    pendingSince: "2026-03-08T10:00:00Z",
    ...over,
  };
}

function incoming(over: Partial<IncomingRow> = {}): IncomingRow {
  return {
    providerTransactionId: "prov-1",
    providerAccountId: "bank-acct-1",
    accountId: ACCOUNT,
    amountCents: -6430,
    description: "AMPOL FOODARY ALEXANDRIA",
    merchant: "Ampol",
    occurredOn: "2026-03-08",
    clearedOn: "2026-03-09",
    status: "posted",
    providerCategory: null,
    ...over,
  };
}

/* ------------------------- tokenising bank text ------------------------- */

check("tokenise strips noise and digits", tokenise("SQ *COFFEE ANTHOLOGY 1234 PTY LTD"), ["coffee", "anthology"]);
check("tokenise handles empty", tokenise("POS 123"), []);

/* -------------------- settlement under the same id ---------------------- */

{
  const plan = reconcile({
    existing: [ledger()],
    incoming: [incoming()],
    now: NOW,
  });
  check("same id: one clear", plan.clears.length, 1);
  check("same id: nothing inserted", plan.inserts.length, 0);
  check("same id: nothing dropped", plan.drops.length, 0);
  check("same id: no replacement recorded", plan.clears[0]?.replacedProviderTransactionId, null);
}

/* ---------------- settlement under a new id, amount moved --------------- */

{
  // A fuel pre-authorisation of $64.30 settles two days later at $91.15 under
  // a different provider id — the classic case a naive importer duplicates.
  const plan = reconcile({
    existing: [ledger()],
    incoming: [
      incoming({
        providerTransactionId: "prov-2",
        amountCents: -9115,
        occurredOn: "2026-03-08",
        clearedOn: "2026-03-10",
      }),
    ],
    now: NOW,
  });
  check("new id: folded into the pending row", plan.clears.length, 1);
  check("new id: not duplicated", plan.inserts.length, 0);
  check("new id: keeps the old id for the audit trail", plan.clears[0]?.replacedProviderTransactionId, "prov-1");
  check("new id: settles at the bank's figure", plan.clears[0]?.incoming.amountCents, -9115);
  check("new id: remembers what was held", plan.clears[0]?.previousAmountCents, -6430);
}

/* ---------------- a different merchant is not a settlement -------------- */

{
  const plan = reconcile({
    existing: [ledger()],
    incoming: [
      incoming({
        providerTransactionId: "prov-3",
        description: "WOOLWORTHS 1234 SYDNEY",
        merchant: "Woolworths",
        amountCents: -6430,
        occurredOn: "2026-03-05",
      }),
    ],
    now: NOW,
  });
  check("different merchant: inserted, not matched", plan.inserts.length, 1);
  check("different merchant: pending left alone", plan.clears.length, 0);
}

/* ------------------ a refund never settles a purchase ------------------- */

{
  const plan = reconcile({
    existing: [ledger()],
    incoming: [incoming({ providerTransactionId: "prov-4", amountCents: 6430 })],
    now: NOW,
  });
  check("opposite sign: not a settlement", plan.clears.length, 0);
  check("opposite sign: kept as its own row", plan.inserts.length, 1);
}

/* ---------------------- an abandoned authorisation ---------------------- */

{
  // Absent from the bank's window and old enough to have settled by now.
  const plan = reconcile({
    existing: [ledger({ pendingSince: "2026-03-01T10:00:00Z" })],
    incoming: [],
    now: NOW,
  });
  check("abandoned hold: released", plan.drops.length, 1);
}

{
  // Absent but too recent to write off — banks lag.
  const plan = reconcile({
    existing: [
      ledger({ pendingSince: new Date(NOW - 2 * 3_600_000).toISOString() }),
    ],
    incoming: [],
    now: NOW,
  });
  check("recent hold: left pending", plan.drops.length, 0);
}

check("drop window is three days", DROP_AFTER_HOURS, 72);

/* ------------------- a hold the bank explicitly declines ---------------- */

{
  const plan = reconcile({
    existing: [ledger()],
    incoming: [incoming({ status: "declined" })],
    now: NOW,
  });
  check("declined by the bank: released", plan.drops.length, 1);
  check("declined by the bank: not cleared", plan.clears.length, 0);
}

/* --------------------------- revised details ---------------------------- */

{
  const plan = reconcile({
    existing: [ledger({ status: "posted" })],
    incoming: [incoming({ description: "AMPOL ALEXANDRIA NSW" })],
    now: NOW,
  });
  check("revision: recorded as an update", plan.updates.length, 1);
  check("revision: names the field", plan.updates[0]?.changed, ["description"]);
}

{
  const plan = reconcile({
    existing: [ledger({ status: "posted" })],
    incoming: [incoming()],
    now: NOW,
  });
  check("unchanged row: no work", plan.updates.length + plan.inserts.length + plan.clears.length, 0);
}

/* ------------------ two holds competing for one settlement -------------- */

{
  // The stronger match must win, and the weaker pending row must stay open
  // rather than being cleared by someone else's settlement.
  const exact = ledger({ id: "row-exact", providerTransactionId: "p-exact", amountCents: -5000 });
  const loose = ledger({ id: "row-loose", providerTransactionId: "p-loose", amountCents: -5400 });

  const plan = reconcile({
    existing: [exact, loose],
    incoming: [incoming({ providerTransactionId: "p-new", amountCents: -5000 })],
    now: NOW,
  });
  check("competing holds: exactly one cleared", plan.clears.length, 1);
  check("competing holds: the exact amount won", plan.clears[0]?.id, "row-exact");
  check("competing holds: the other stays pending", plan.drops.length, 0);
}

/* -------------------------- scoring boundaries -------------------------- */

check(
  "identical purchase scores well above the threshold",
  settlementScore(ledger(), incoming({ providerTransactionId: "x" })) >= MIN_SETTLEMENT_SCORE,
  true,
);
check(
  "a different account never matches",
  settlementScore(ledger(), incoming({ accountId: "acct-2", providerTransactionId: "x" })),
  0,
);
check(
  "a fortnight later never matches",
  settlementScore(ledger(), incoming({ occurredOn: "2026-03-25", providerTransactionId: "x" })),
  0,
);
check(
  "a wildly different amount never matches",
  settlementScore(ledger(), incoming({ amountCents: -50000, providerTransactionId: "x" })),
  0,
);

/* ------------- a second genuine purchase at the same merchant ----------- */

{
  // Same shop, same week, very different amount: two separate purchases, not
  // one settling. Folding these together would silently lose $120 of spending.
  const plan = reconcile({
    existing: [
      ledger({
        amountCents: -5000,
        description: "WOOLWORTHS 1234 SYDNEY",
        merchant: "Woolworths",
      }),
    ],
    incoming: [
      incoming({
        providerTransactionId: "prov-9",
        amountCents: -12000,
        description: "WOOLWORTHS 1234 SYDNEY",
        merchant: "Woolworths",
        occurredOn: "2026-03-10",
      }),
    ],
    now: NOW,
  });
  check("same merchant, far apart in value: kept separate", plan.inserts.length, 1);
  check("same merchant, far apart in value: hold untouched", plan.clears.length, 0);
}

/* ------------------------ a straightforward import ---------------------- */

{
  const plan = reconcile({
    existing: [],
    incoming: [
      incoming({ providerTransactionId: "a" }),
      incoming({ providerTransactionId: "b", status: "pending", clearedOn: null }),
      incoming({ providerTransactionId: "c", status: "declined" }),
    ],
    now: NOW,
  });
  check("fresh window: declined rows are not imported", plan.inserts.length, 2);
}

console.log(`\nreconcile: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
