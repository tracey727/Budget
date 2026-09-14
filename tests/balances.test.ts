/**
 * The money arithmetic and the demo bank's clearing behaviour.
 *
 * The sandbox is exercised here rather than mocked, because it is a real
 * provider: if its pending transactions do not settle as the clock advances,
 * the whole pending → cleared story is broken for anyone evaluating the app
 * before signing up to a data recipient.
 */

import { safeToSpend, toCents, centsToDecimalString, gstFromInclusive } from "../src/lib/money";
import { sandboxProvider, SANDBOX_SETTLEMENT_HOURS } from "../src/lib/bank/sandbox";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

/* ------------------------------- money ---------------------------------- */

check("cents round-trip", centsToDecimalString(toCents("1234.56")), "1234.56");
check("negative cents round-trip", centsToDecimalString(toCents("-0.05")), "-0.05");
check("GST is a eleventh of a tax-inclusive price", gstFromInclusive(11000), 1000);

check(
  "safe to spend deducts pending and committed money",
  safeToSpend({ availableCents: 120_000, committedCents: -45_000 }),
  75_000,
);
check(
  "committed money is deducted whichever sign it arrives with",
  safeToSpend({ availableCents: 120_000, committedCents: 45_000 }),
  75_000,
);
check(
  "safe to spend can go negative, and says so",
  safeToSpend({ availableCents: 10_000, committedCents: 45_000 }),
  -35_000,
);

/* ---------------------------- the demo bank ----------------------------- */

async function demoBank() {
const ref = { providerConnectionId: "sbx-test", providerUserId: "user-1" };

const [everyday, saver] = await sandboxProvider.listAccounts(ref);
check("two demo accounts", [everyday.name, saver.name], ["Demo Everyday", "Demo Saver"]);

const transactions = await sandboxProvider.listTransactions(ref, "2000-01-01");
check("the demo bank has a ledger", transactions.length > 40, true);

const pending = transactions.filter((row) => row.status === "pending");
const posted = transactions.filter((row) => row.status === "posted");
check("some of it is still pending", pending.length > 0, true);
check("most of it has settled", posted.length > pending.length, true);

check(
  "pending rows carry no settlement date",
  pending.every((row) => row.clearedOn === null),
  true,
);
check(
  "settled rows carry one",
  posted.every((row) => row.clearedOn !== null),
  true,
);
check(
  "nothing pending is older than the settlement cycle, give or take a day",
  pending.every((row) => {
    const age = Date.now() - Date.parse(`${row.occurredOn}T00:00:00Z`);
    return age <= (SANDBOX_SETTLEMENT_HOURS + 24) * 3_600_000;
  }),
  true,
);

// Ids are stable across calls, which is what lets the reconciler recognise a
// transaction it has already seen instead of importing it twice.
const again = await sandboxProvider.listTransactions(ref, "2000-01-01");
check(
  "transaction ids are stable between syncs",
  again.map((row) => row.providerTransactionId).join(),
  transactions.map((row) => row.providerTransactionId).join(),
);
check(
  "ids are unique",
  new Set(transactions.map((row) => row.providerTransactionId)).size,
  transactions.length,
);

// The bank's own two balances have to disagree by exactly the pending total,
// or the "safe to spend" figure shown in the app is a fiction.
const everydayPending = transactions
  .filter((row) => row.providerAccountId === everyday.providerAccountId && row.status === "pending")
  .reduce((total, row) => total + row.amountCents, 0);

check(
  "available balance is the ledger balance less what is pending",
  (everyday.availableBalanceCents ?? 0) - (everyday.ledgerBalanceCents ?? 0),
  everydayPending,
);

check(
  "a different person gets a different ledger",
  (await sandboxProvider.listTransactions(
    { providerConnectionId: "sbx-other", providerUserId: "user-2" },
    "2000-01-01",
  ))[0].providerTransactionId !== transactions[0].providerTransactionId,
  true,
);

}

demoBank().then(() => {
  console.log(`\nbalances: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
});
