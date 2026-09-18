/**
 * Import mapping and validation.
 *
 * The behaviour under test is mostly refusal: the importer's job is to be
 * unambiguous, so most of these cases assert that a doubtful value is rejected
 * or held rather than accepted with a best guess.
 */

import { suggestMapping, missingRequired, toMappingConfig } from "../src/lib/rescue/mapping";
import { normaliseRow, parseDateValue, parseInstantValue, parseMoneyValue } from "../src/lib/rescue/validate";
import type { MappingConfig } from "../src/lib/rescue/validate";
import { SOURCES } from "../src/lib/rescue/sources";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

const TZ = "Australia/Sydney";

/* ------------------------------ mapping ---------------------------------- */

const headers = ["appointment_ref", "Client ID", "practitioner", "Start Time", "end", "Status", "Fee", "cancelled_at"];
const suggested = suggestMapping("appointments", headers);
check("maps an exact header", suggested.appointment_ref, "appointment_ref");
check("maps a known alias", suggested.client_ref, "Client ID");
check("maps a spaced alias", suggested.scheduled_start, "Start Time");
check("maps a fee column to service value", suggested.service_value, "Fee");
check("leaves nothing unmapped twice", new Set(Object.values(suggested).filter(Boolean)).size, Object.values(suggested).filter(Boolean).length);

const sparse = suggestMapping("invoices", ["invoice_ref", "total"]);
check("reports what is still required", missingRequired("invoices", sparse), ["Issue date", "Balance outstanding", "Status"]);
check("nothing required is missing on a full mapping", missingRequired("appointments", suggested).length, 0);

check(
  "an unrecognised header is simply not mapped",
  suggestMapping("invoices", ["some_internal_code"]).invoice_ref,
  null,
);

/* ------------------------------- dates ----------------------------------- */

check("ISO dates pass straight through", parseDateValue("2026-09-01", "iso"), { ok: true, value: "2026-09-01" });
check("an unambiguous day-first date is read", parseDateValue("25/09/2026", "iso"), { ok: true, value: "2026-09-25" });
check(
  "an ambiguous date is held, not guessed",
  (parseDateValue("03/04/2026", "iso") as { severity?: string }).severity,
  "hold",
);
check("declaring the Australian convention resolves it", parseDateValue("03/04/2026", "au_dmy"), { ok: true, value: "2026-04-03" });
check(
  "a date that does not exist is rejected",
  (parseDateValue("31/02/2026", "au_dmy") as { severity?: string }).severity,
  "invalid",
);
check("an empty date is simply absent", parseDateValue("", "iso"), { ok: true, value: null });
check(
  "text in a date column is rejected",
  (parseDateValue("next tuesday", "iso") as { severity?: string }).severity,
  "invalid",
);

/* ----------------------------- timestamps -------------------------------- */

check(
  "an offset timestamp keeps its instant",
  parseInstantValue("2026-09-01T09:00:00+10:00", "iso", TZ),
  { ok: true, value: "2026-08-31T23:00:00.000Z" },
);
check(
  "a bare timestamp is read in the tenant timezone",
  parseInstantValue("2026-09-01 09:00", "iso", TZ),
  { ok: true, value: "2026-08-31T23:00:00.000Z" },
);
check(
  "a winter timestamp uses standard time, not summer time",
  parseInstantValue("2026-07-01 09:00", "iso", TZ),
  { ok: true, value: "2026-06-30T23:00:00.000Z" },
);
check(
  "an impossible time of day is rejected",
  (parseInstantValue("2026-09-01T29:00:00", "iso", TZ) as { severity?: string }).severity,
  "invalid",
);

/* ------------------------------- money ----------------------------------- */

check("a plain amount becomes cents", parseMoneyValue("252.99"), { ok: true, value: 25299 });
check("currency formatting is stripped", parseMoneyValue("$1,252.99"), { ok: true, value: 125299 });
check("brackets mean negative", parseMoneyValue("(45.00)"), { ok: true, value: -4500 });
check("an empty amount is absent, not zero", parseMoneyValue(""), { ok: true, value: null });
check("a formula cell is held", (parseMoneyValue("=SUM(A1:A4)") as { severity?: string }).severity, "hold");
check("words in a money column are rejected", (parseMoneyValue("n/a") as { severity?: string }).severity, "invalid");
check("three decimal places are rejected", (parseMoneyValue("10.005") as { severity?: string }).severity, "invalid");

/* ------------------------------- rows ------------------------------------ */

function config(over: Partial<MappingConfig> = {}): MappingConfig {
  return {
    fields: {
      appointment_ref: "ref",
      client_ref: "client",
      worker_ref: "worker",
      scheduled_start: "start",
      scheduled_end: "end",
      status: "status",
      service_value: "fee",
      cancellation_at: "cancelled",
    },
    dateConvention: "iso",
    timeZone: TZ,
    ...over,
  };
}

const goodRow = normaliseRow("appointments", config(), {
  ref: "APT-001",
  client: "CL-001",
  worker: "W-001",
  start: "2026-09-01T09:00:00+10:00",
  end: "2026-09-01T10:00:00+10:00",
  status: "cancelled",
  fee: "252.99",
  cancelled: "2026-08-31T15:00:00+10:00",
});
check("a clean row validates", goodRow.status, "valid");
check("money lands as cents", goodRow.values.service_value, 25299);
check("timestamps land as instants", goodRow.values.scheduled_start, "2026-08-31T23:00:00.000Z");

const missingRef = normaliseRow("appointments", config(), { ref: "", start: "2026-09-01T09:00:00+10:00", status: "cancelled" });
check("a missing required field is invalid", missingRef.status, "invalid");
check("and says which field", missingRef.issues[0]?.field, "appointment_ref");

const unmapped = normaliseRow("appointments", config({ fields: { appointment_ref: "ref" } }), { ref: "APT-001" });
check("an unmapped required column is invalid", unmapped.status, "invalid");

const badFee = normaliseRow("appointments", config(), {
  ref: "APT-002", start: "2026-09-01T09:00:00+10:00", status: "cancelled", fee: "about 250",
});
check("an unreadable amount invalidates the row", badFee.status, "invalid");

const backwards = normaliseRow("appointments", config(), {
  ref: "APT-003",
  start: "2026-09-01T09:00:00+10:00",
  end: "2026-09-01T08:00:00+10:00",
  status: "booked",
});
check("an appointment ending before it starts is held", backwards.status, "hold");

const lateCancellation = normaliseRow("appointments", config(), {
  ref: "APT-004",
  start: "2026-09-01T09:00:00+10:00",
  status: "cancelled",
  cancelled: "2026-09-02T09:00:00+10:00",
});
check("a cancellation after the start is held", lateCancellation.status, "hold");

const oddInvoice = normaliseRow(
  "invoices",
  { fields: { invoice_ref: "ref", issue_date: "issued", due_date: "due", total: "total", balance: "balance", status: "status" }, dateConvention: "iso", timeZone: TZ },
  { ref: "INV-1", issued: "2026-09-10", due: "2026-09-01", total: "100.00", balance: "100.00", status: "open" },
);
check("an invoice due before it was issued is held", oddInvoice.status, "hold");

const overBalance = normaliseRow(
  "invoices",
  { fields: { invoice_ref: "ref", issue_date: "issued", total: "total", balance: "balance", status: "status" }, dateConvention: "iso", timeZone: TZ },
  { ref: "INV-2", issued: "2026-09-10", total: "100.00", balance: "250.00", status: "open" },
);
check("a balance larger than the total is held", overBalance.status, "hold");

/* --------------------------- stored mappings ----------------------------- */

const restored = toMappingConfig({ fields: { invoice_ref: "Number", client_ref: "" }, dateConvention: "au_dmy" }, TZ);
check("a stored mapping comes back", restored.fields.invoice_ref, "Number");
check("an empty stored header is treated as unmapped", restored.fields.client_ref, null);
check("the stored convention is kept", restored.dateConvention, "au_dmy");
check("the tenant timezone fills the gap", restored.timeZone, TZ);
check("a corrupt stored mapping falls back safely", toMappingConfig(null, TZ).dateConvention, "iso");

/* ----------------------------- definitions ------------------------------- */

check("all six source templates exist", Object.keys(SOURCES).length, 6);
check(
  "every field declares help text",
  Object.values(SOURCES).every((s) => s.fields.every((f) => f.help.length > 10)),
  true,
);
check(
  "every source has at least one required field",
  Object.values(SOURCES).every((s) => s.fields.some((f) => f.required)),
  true,
);

console.log(`\nrescue-import: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
