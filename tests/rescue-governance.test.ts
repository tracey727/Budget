/**
 * The promises that are not about detection: who may do what, how confirmed
 * recovery is kept honest, and what leaves the building in an export.
 */

import { can, refusal, ROLES } from "../src/lib/rescue/permissions";
import { checkRecovery, fullyRecovered } from "../src/lib/rescue/recovery";
import { csvCell, toCsv, csvBody } from "../src/lib/rescue/csv-export";
import { mergeSettings } from "../src/lib/rescue/settings";
import { AT_RISK_BASES, scoreFinding, VALUE_BASIS_LABEL } from "../src/lib/rescue/priority";
import { DEFAULT_RULE_SETTINGS, asBand, asValueBasis, asConfidence, centsOf } from "../src/lib/rescue/types";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

/* ------------------------------ permissions ------------------------------ */

check("an owner may manage members", can("owner", "manage_members"), true);
check("a manager may not manage members", can("manager", "manage_members"), false);
check("a manager may record recovery", can("manager", "record_recovery"), true);
check("a reviewer may not record recovery", can("reviewer", "record_recovery"), false);
check("a reviewer may not dismiss", can("reviewer", "dismiss"), false);
check("a reviewer may progress work", can("reviewer", "progress"), true);
check("an auditor changes nothing", can("auditor", "progress"), false);
check("an auditor may read the audit trail", can("auditor", "view_audit"), true);
check("an auditor may export", can("auditor", "export"), true);
check("an auditor may not import", can("auditor", "import"), false);
check("every role may view", ROLES.every((role) => can(role, "view")), true);
check(
  "only owners and admins manage settings",
  ROLES.filter((role) => can(role, "manage_settings")),
  ["owner", "admin"],
);
check("a refusal names the role and the action", refusal("reviewer", "dismiss"), "Your role (Reviewer) cannot dismiss a finding. Ask an owner or admin if you need to.");

/* -------------------------------- recovery ------------------------------- */

const estimate = 25299;

check("a first partial recovery is allowed", checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 0, amountCents: 10000 }).ok, true);
check("a second partial recovery is allowed", checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 10000, amountCents: 15299 }).ok, true);
check("recovering the exact estimate is allowed", checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 0, amountCents: estimate }).ok, true);

const over = checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 20000, amountCents: 10000 });
check("recovering past the estimate is refused", over.ok, false);
check("and says it would double-count", over.ok === false && over.reason, "exceeds_estimate");
check("and says how much is left", over.ok === false && over.message.includes("52.99"), true);

const already = checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: estimate, amountCents: 100 });
check("a fully recovered finding takes no more", already.ok === false && already.message.includes("already fully recovered"), true);

const held = checkRecovery({ held: true, estimatedCents: estimate, alreadyCents: 0, amountCents: 100 });
check("a held finding can never carry recovery", held.ok, false);
check("and the reason is the hold itself", held.ok === false && held.reason, "held");

check("a negative amount is refused", checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 0, amountCents: -500 }).ok, false);
check(
  "a negative amount points at reversal instead",
  (() => { const r = checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 0, amountCents: -500 }); return r.ok === false && r.message.includes("reverse"); })(),
  true,
);
check("zero is refused", checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 0, amountCents: 0 }).ok, false);
check(
  "a finding claiming no value has no ceiling",
  checkRecovery({ held: false, estimatedCents: null, alreadyCents: 500000, amountCents: 100000 }).ok,
  true,
);
check("a reversal leaves room to record again", checkRecovery({ held: false, estimatedCents: estimate, alreadyCents: 0, amountCents: estimate }).ok, true);

check("full recovery is recognised", fullyRecovered(estimate, estimate), true);
check("partial recovery is not", fullyRecovered(estimate, estimate - 1), false);
check("a valueless finding is never 'fully' recovered", fullyRecovered(null, 100000), false);

/* ------------------------------ value basis ------------------------------ */

check("only real exposure counts as at risk", AT_RISK_BASES, ["at_risk", "outstanding"]);
check("unmatched money is excluded from the headline", AT_RISK_BASES.includes("unmatched"), false);
check("potential value is excluded from the headline", AT_RISK_BASES.includes("potential"), false);
check("duplicates are excluded from the headline", AT_RISK_BASES.includes("duplicate"), false);
check("every basis has a label", Object.keys(VALUE_BASIS_LABEL).length, 6);

/* ------------------------------- narrowing ------------------------------- */

check("a known band comes through", asBand("red"), "red");
check("an unknown band falls back to hold", asBand("crimson"), "hold");
check("an unknown basis claims nothing", asValueBasis("guesswork"), "none");
check("an unknown confidence is treated as a hold", asConfidence("probably"), "hold");
check("a numeric column becomes cents", centsOf("252.99"), 25299);
check("a null column stays null", centsOf(null), null);
check("a corrupt numeric column does not become zero", centsOf("n/a"), null);

/* -------------------------------- settings ------------------------------- */

check("no stored settings gives the defaults", mergeSettings(null), DEFAULT_RULE_SETTINGS);
check("a stored threshold is honoured", mergeSettings({ invoiceGraceDays: 21 }).invoiceGraceDays, 21);
check("a negative threshold is rejected", mergeSettings({ invoiceGraceDays: -5 }).invoiceGraceDays, DEFAULT_RULE_SETTINGS.invoiceGraceDays);
check("a non-numeric threshold is rejected", mergeSettings({ invoiceGraceDays: "soon" }).invoiceGraceDays, DEFAULT_RULE_SETTINGS.invoiceGraceDays);
check("an empty task type list falls back", mergeSettings({ revenueTaskTypes: [] }).revenueTaskTypes, DEFAULT_RULE_SETTINGS.revenueTaskTypes);
check("stored task types are kept", mergeSettings({ revenueTaskTypes: ["claim_followup"] }).revenueTaskTypes, ["claim_followup"]);

/* -------------------------------- exports -------------------------------- */

check("a plain cell is untouched", csvCell("INV-1001"), "INV-1001");
check("a comma forces quoting", csvCell("Smith, J"), '"Smith, J"');
check("a quote is doubled", csvCell('He said "no"'), '"He said ""no"""');
check("a newline forces quoting", csvCell("line one\nline two"), '"line one\nline two"');
check("a null cell is empty", csvCell(null), "");
check("a formula cell is neutralised", csvCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
check("a leading plus is neutralised", csvCell("+1 400 000 000"), "'+1 400 000 000");
check("a leading minus is neutralised", csvCell("-cmd"), "'-cmd");
check("a negative amount is still neutralised but readable", csvCell("-252.99"), "'-252.99");
check("dates export as ISO instants", csvCell(new Date("2026-09-18T02:00:00.000Z")), "2026-09-18T02:00:00.000Z");
check(
  "rows are CRLF separated",
  toCsv(["a", "b"], [[1, 2], [3, 4]]),
  "a,b\r\n1,2\r\n3,4",
);
check("the body carries a byte-order mark for Excel", csvBody(["a"], [[1]]).charCodeAt(0), 0xfeff);

/* ----------------------------- priority again ---------------------------- */

const same = { confidence: "high" as const, estimatedValueCents: 50_000, valueBasis: "outstanding" as const, occurredAt: "2026-08-01T00:00:00.000Z", now: new Date("2026-09-18T00:00:00.000Z") };
check("scoring is deterministic", scoreFinding(same).score, scoreFinding(same).score);
check("a hold is not scored even with a large value", scoreFinding({ ...same, confidence: "hold" }).band, "hold");
check(
  "an older finding outranks an identical newer one",
  scoreFinding(same).score > scoreFinding({ ...same, occurredAt: "2026-09-17T00:00:00.000Z" }).score,
  true,
);
check(
  "a bigger finding outranks an identical smaller one",
  scoreFinding(same).score > scoreFinding({ ...same, estimatedValueCents: 1_000 }).score,
  true,
);

console.log(`\nrescue-governance: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
