/**
 * Golden fixtures for the allied-health rule pack.
 *
 * Every V1 rule has at least one case that must fire, one that must not, and
 * where the contract defines one, a HOLD case. The dataset is fixed and `now`
 * is passed in, so a run today and a run next year give identical output —
 * which is the only way a versioned rule can be regression tested at all.
 */

import { RULES, runRule, runRules } from "../src/lib/rescue/rules";
import { scoreFinding } from "../src/lib/rescue/priority";
import {
  DEFAULT_RULE_SETTINGS,
  emptyDataset,
  type Appointment,
  type Invoice,
  type OperationalTask,
  type Payment,
  type Referral,
  type RuleContext,
  type TenantDataset,
  type WaitlistEntry,
} from "../src/lib/rescue/types";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

const NOW = new Date("2026-09-18T02:00:00.000Z"); // midday in Sydney
const TZ = "Australia/Sydney";

function ctx(data: Partial<TenantDataset>): RuleContext {
  return { now: NOW, timeZone: TZ, settings: DEFAULT_RULE_SETTINGS, data: { ...emptyDataset(), ...data } };
}

function appointment(over: Partial<Appointment> = {}): Appointment {
  return {
    id: "a1",
    externalRef: "APT-001",
    clientRef: "CL-001",
    workerRef: "W-001",
    scheduledStart: "2026-09-01T23:00:00.000Z", // 9am Sydney, 2 Sept
    scheduledEnd: "2026-09-02T00:00:00.000Z",
    status: "cancelled",
    serviceValueCents: 25299,
    cancellationAt: "2026-09-01T05:00:00.000Z",
    ...over,
  };
}

function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    externalRef: "INV-1001",
    clientRef: "CL-002",
    issueDate: "2026-09-01",
    dueDate: "2026-09-08",
    totalCents: 25299,
    balanceCents: 25299,
    status: "overdue",
    ...over,
  };
}

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: "p1",
    externalRef: "PAY-001",
    paymentDate: "2026-09-11",
    amountCents: 25299,
    invoiceRef: null,
    matchStatus: "unmatched",
    ...over,
  };
}

function referral(over: Partial<Referral> = {}): Referral {
  return { id: "r1", externalRef: "REF-001", receivedAt: "2026-08-20T00:00:00.000Z", status: "received", progressedAt: null, ...over };
}

function task(over: Partial<OperationalTask> = {}): OperationalTask {
  return {
    id: "t1",
    externalRef: "TASK-001",
    taskType: "invoice_followup",
    dueAt: "2026-09-10T07:00:00.000Z",
    status: "open",
    relatedValueCents: 25299,
    relatedRef: "INV-1001",
    ...over,
  };
}

function waitlist(over: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return { id: "w1", externalRef: "WL-001", clientRef: "CL-010", status: "open", availability: "weekday mornings", createdAt: "2026-08-01T00:00:00.000Z", ...over };
}

const rule = (id: string) => RULES.find((r) => r.id === id)!;
const run = (id: string, data: Partial<TenantDataset>) => runRule(rule(id), ctx(data));

/* ----------------------- RR-AH-001 cancelled slot ------------------------ */

const cancelled = run("RR-AH-001", { appointments: [appointment()] });
check("001 fires for an unrefilled cancellation", cancelled.length, 1);
check("001 carries the imported service value", cancelled[0]?.estimatedValueCents, 25299);
check("001 counts as value at risk", cancelled[0]?.valueBasis, "at_risk");
check("001 key is stable", cancelled[0]?.findingKey, "RR-AH-001.v1:appointment:APT-001");
check("001 records the rule version", cancelled[0]?.ruleVersion, 1);

check(
  "001 stays quiet when the slot was refilled",
  run("RR-AH-001", {
    appointments: [
      appointment(),
      appointment({ id: "a2", externalRef: "APT-009", status: "booked", cancellationAt: null }),
    ],
  }).length,
  0,
);

check(
  "001 ignores another practitioner being busy in that hour",
  run("RR-AH-001", {
    appointments: [
      appointment(),
      appointment({ id: "a2", externalRef: "APT-009", status: "booked", workerRef: "W-999", cancellationAt: null }),
    ],
  }).length,
  1,
);

check(
  "001 leaves a future slot alone",
  run("RR-AH-001", {
    appointments: [appointment({ scheduledStart: "2026-10-01T23:00:00.000Z", scheduledEnd: "2026-10-02T00:00:00.000Z" })],
  }).length,
  0,
);

const contradictory = run("RR-AH-001", {
  appointments: [appointment({ cancellationAt: "2026-09-05T00:00:00.000Z" })],
});
check("001 holds a cancellation recorded after the start", contradictory[0]?.confidence, "hold");
check("001 claims no value on a hold", contradictory[0]?.estimatedValueCents, null);

check(
  "001 drops to medium confidence with no service value",
  run("RR-AH-001", { appointments: [appointment({ serviceValueCents: null })] })[0]?.confidence,
  "medium",
);

/* --------------------- RR-AH-002 attendance review ----------------------- */

const noShow = run("RR-AH-002", { appointments: [appointment({ status: "no_show", cancellationAt: null })] });
check("002 fires for a no-show", noShow.length, 1);
check("002 shows the no-show value at risk", noShow[0]?.estimatedValueCents, 25299);

const lateCancel = run("RR-AH-002", { appointments: [appointment()] });
check("002 fires for a late cancellation", lateCancel.length, 1);
check("002 never double-counts the slot value", lateCancel[0]?.estimatedValueCents, null);
check("002 marks the late cancellation as carrying no value", lateCancel[0]?.valueBasis, "none");

check(
  "002 ignores a cancellation outside the late window",
  run("RR-AH-002", { appointments: [appointment({ cancellationAt: "2026-08-20T00:00:00.000Z" })] }).length,
  0,
);

check(
  "002 stops once the follow-up task is completed",
  run("RR-AH-002", {
    appointments: [appointment({ status: "no_show", cancellationAt: null })],
    tasks: [task({ relatedRef: "APT-001", status: "completed", taskType: "rebooking" })],
  }).length,
  0,
);

const lateNoTime = run("RR-AH-002", {
  appointments: [appointment({ status: "late_cancelled", cancellationAt: null })],
});
check("002 holds a late cancellation with no cancellation time", lateNoTime[0]?.confidence, "hold");

/* ------------------ RR-AH-003 completed, not invoiced -------------------- */

const completed = appointment({ status: "completed", clientRef: "CL-002", cancellationAt: null });
check("003 fires when nothing was invoiced", run("RR-AH-003", { appointments: [completed] }).length, 1);
check(
  "003 stays quiet when an invoice lands inside the grace period",
  run("RR-AH-003", { appointments: [completed], invoices: [invoice({ issueDate: "2026-09-03" })] }).length,
  0,
);
check(
  "003 ignores an invoice for a different client",
  run("RR-AH-003", { appointments: [completed], invoices: [invoice({ clientRef: "CL-777" })] }).length,
  1,
);
check(
  "003 ignores an invoice raised long after the grace period",
  run("RR-AH-003", { appointments: [completed], invoices: [invoice({ issueDate: "2026-09-16" })] }).length,
  1,
);
check(
  "003 waits out the grace period",
  run("RR-AH-003", {
    appointments: [appointment({ status: "completed", scheduledStart: "2026-09-16T23:00:00.000Z", cancellationAt: null })],
  }).length,
  0,
);
check(
  "003 holds a completed service with no client reference",
  run("RR-AH-003", { appointments: [appointment({ status: "completed", clientRef: null, cancellationAt: null })] })[0]?.confidence,
  "hold",
);

/* -------------------- RR-AH-004 overdue, no follow-up -------------------- */

const overdue = run("RR-AH-004", { invoices: [invoice()] });
check("004 fires for an overdue invoice", overdue.length, 1);
check("004 carries the outstanding balance", overdue[0]?.estimatedValueCents, 25299);
check("004 calls the value outstanding", overdue[0]?.valueBasis, "outstanding");
check(
  "004 stops when someone is chasing it",
  run("RR-AH-004", { invoices: [invoice()], tasks: [task()] }).length,
  0,
);
check(
  "004 fires again when the chase went stale",
  run("RR-AH-004", { invoices: [invoice()], tasks: [task({ dueAt: "2026-08-01T00:00:00.000Z" })] }).length,
  1,
);
check("004 ignores a paid invoice", run("RR-AH-004", { invoices: [invoice({ balanceCents: 0, status: "paid" })] }).length, 0);
check(
  "004 ignores an invoice that is not due yet",
  run("RR-AH-004", { invoices: [invoice({ dueDate: "2026-09-30" })] }).length,
  0,
);
check(
  "004 ignores a credited invoice",
  run("RR-AH-004", { invoices: [invoice({ status: "credited" })] }).length,
  0,
);

/* ---------------------- RR-AH-005 unmatched payment ---------------------- */

const unmatched = run("RR-AH-005", { payments: [payment()] });
check("005 fires for an unallocated payment", unmatched.length, 1);
check("005 treats it as unmatched funds, not lost revenue", unmatched[0]?.valueBasis, "unmatched");
check(
  "005 stays quiet once the payment is allocated",
  run("RR-AH-005", { payments: [payment({ invoiceRef: "INV-1001" })], invoices: [invoice()] }).length,
  0,
);
const danglingRef = run("RR-AH-005", { payments: [payment({ invoiceRef: "INV-9999" })], invoices: [invoice()] });
check("005 holds a payment pointing at a missing invoice", danglingRef[0]?.confidence, "hold");
check("005 claims no value on that hold", danglingRef[0]?.estimatedValueCents, null);

/* --------------------- RR-AH-006 referral not moved ---------------------- */

check("006 fires for a stale referral", run("RR-AH-006", { referrals: [referral()] }).length, 1);
check("006 never invents future revenue", run("RR-AH-006", { referrals: [referral()] })[0]?.estimatedValueCents, null);
check(
  "006 ignores a booked referral",
  run("RR-AH-006", { referrals: [referral({ status: "booked", progressedAt: "2026-08-21T00:00:00.000Z" })] }).length,
  0,
);
check(
  "006 ignores a referral inside the threshold",
  run("RR-AH-006", { referrals: [referral({ receivedAt: "2026-09-15T00:00:00.000Z" })] }).length,
  0,
);

/* ---------------------- RR-AH-007 waitlist missed ------------------------ */

const missed = run("RR-AH-007", { appointments: [appointment()], waitlist: [waitlist()] });
check("007 fires when a slot passed with people waiting", missed.length, 1);
check("007 labels the value as potential only", missed[0]?.valueBasis, "potential");
check(
  "007 needs someone actually waiting",
  run("RR-AH-007", { appointments: [appointment()], waitlist: [waitlist({ status: "closed" })] }).length,
  0,
);
check(
  "007 ignores a waitlist entry added after the slot",
  run("RR-AH-007", { appointments: [appointment()], waitlist: [waitlist({ createdAt: "2026-09-10T00:00:00.000Z" })] }).length,
  0,
);

/* ---------------------- RR-AH-008 overdue task --------------------------- */

const overdueTask = run("RR-AH-008", { tasks: [task({ relatedRef: null })] });
check("008 fires for an overdue revenue task", overdueTask.length, 1);
check("008 uses only the imported related value", overdueTask[0]?.estimatedValueCents, 25299);
check(
  "008 defers to the invoice when the same money is already counted",
  run("RR-AH-008", { tasks: [task()], invoices: [invoice()] })[0]?.estimatedValueCents,
  null,
);
check("008 ignores a completed task", run("RR-AH-008", { tasks: [task({ status: "completed" })] }).length, 0);
check(
  "008 ignores a task type that is not revenue related",
  run("RR-AH-008", { tasks: [task({ taskType: "clinical_note" })] }).length,
  0,
);
check("008 ignores a task with no due date", run("RR-AH-008", { tasks: [task({ dueAt: null })] }).length, 0);

/* --------------------- RR-AH-009 duplicate invoices ---------------------- */

const twin = invoice({ id: "i2", externalRef: "INV-1003", clientRef: "CL-004", status: "open" });
const twinB = invoice({ id: "i3", externalRef: "INV-1002", clientRef: "CL-004", status: "open" });
const duplicates = run("RR-AH-009", { invoices: [twin, twinB] });
check("009 fires for a matching pair", duplicates.length, 1);
check("009 keys the pair in a stable order", duplicates[0]?.findingKey, "RR-AH-009.v1:invoice-pair:INV-1002|INV-1003");
check("009 marks the value as a billing question", duplicates[0]?.valueBasis, "duplicate");
check(
  "009 ignores different amounts",
  run("RR-AH-009", { invoices: [twin, invoice({ id: "i3", externalRef: "INV-1002", clientRef: "CL-004", totalCents: 11100 })] }).length,
  0,
);
check(
  "009 ignores invoices weeks apart",
  run("RR-AH-009", { invoices: [twin, invoice({ id: "i3", externalRef: "INV-1002", clientRef: "CL-004", issueDate: "2026-08-01" })] }).length,
  0,
);
check(
  "009 holds a credited pair rather than calling it a duplicate",
  run("RR-AH-009", { invoices: [twin, invoice({ id: "i3", externalRef: "INV-1002", clientRef: "CL-004", status: "credited" })] })[0]?.confidence,
  "hold",
);

/* ------------------- RR-AH-010 inconsistent statuses --------------------- */

const paidWithBalance = run("RR-AH-010", { invoices: [invoice({ status: "paid" })] });
check("010 holds a paid invoice that still owes money", paidWithBalance.length, 1);
check("010 is always a hold", paidWithBalance[0]?.confidence, "hold");
check("010 never claims a value", paidWithBalance[0]?.estimatedValueCents, null);
check(
  "010 holds an open invoice with nothing owing",
  run("RR-AH-010", { invoices: [invoice({ balanceCents: 0 })] }).length,
  1,
);
check(
  "010 holds a payment dated before its invoice",
  run("RR-AH-010", { invoices: [invoice()], payments: [payment({ paymentDate: "2026-08-20", invoiceRef: "INV-1001" })] }).length,
  1,
);
check(
  "010 holds an appointment both completed and cancelled",
  run("RR-AH-010", { appointments: [appointment({ status: "completed" })] }).length,
  1,
);
check(
  "010 holds a progressed referral with no date",
  run("RR-AH-010", { referrals: [referral({ status: "booked" })] }).length,
  1,
);
check("010 stays silent on consistent data", run("RR-AH-010", { invoices: [invoice()] }).length, 0);

/* ----------------------------- the pack ---------------------------------- */

check("the pack has all ten V1 rules", RULES.length, 10);
check(
  "every rule declares a version and a logic hash",
  RULES.every((r) => r.version >= 1 && /^[0-9a-f]{16}$/.test(r.logicHash)),
  true,
);
check("logic hashes are unique across the pack", new Set(RULES.map((r) => r.logicHash)).size, RULES.length);

const full = ctx({
  appointments: [appointment(), appointment({ id: "a3", externalRef: "APT-003", status: "no_show", cancellationAt: null, workerRef: "W-002" })],
  invoices: [invoice()],
  payments: [payment()],
  referrals: [referral()],
  waitlist: [waitlist()],
  tasks: [task({ relatedRef: null, externalRef: "TASK-050" })],
});
const firstPass = runRules(full);
const secondPass = runRules(full);
check("a re-run over unchanged data is identical", JSON.stringify(secondPass.outputs), JSON.stringify(firstPass.outputs));
check("no rule threw", firstPass.failures.length, 0);
check("finding keys are unique within a run", new Set(firstPass.outputs.map((o) => o.findingKey)).size, firstPass.outputs.length);
check(
  "every finding explains itself",
  firstPass.outputs.every((o) => o.explanation.length > 40 && o.calculation.length > 20),
  true,
);
check(
  "every hold gives a reason",
  firstPass.outputs.filter((o) => o.confidence === "hold").every((o) => Boolean(o.holdReason)),
  true,
);

/* --------------------------- priority banding ---------------------------- */

const big = scoreFinding({ confidence: "high", estimatedValueCents: 250_000, valueBasis: "outstanding", occurredAt: "2026-07-01T00:00:00.000Z", now: NOW });
check("a large, old, certain finding is red", big.band, "red");

const small = scoreFinding({ confidence: "medium", estimatedValueCents: 4_000, valueBasis: "at_risk", occurredAt: "2026-09-17T00:00:00.000Z", now: NOW });
check("a small, fresh finding is green", small.band, "green");

const held = scoreFinding({ confidence: "hold", estimatedValueCents: null, valueBasis: "none", occurredAt: "2026-01-01T00:00:00.000Z", now: NOW });
check("a hold is never ranked", held.band, "hold");
check("a hold scores nothing", held.score, 0);

const mid = scoreFinding({ confidence: "high", estimatedValueCents: 35_000, valueBasis: "outstanding", occurredAt: "2026-09-01T00:00:00.000Z", now: NOW });
check("a mid-sized fortnight-old finding is amber", mid.band, "amber");
check("the reason is written out", mid.rationale.includes("RED starts at 75"), true);

console.log(`\nrescue-rules: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
