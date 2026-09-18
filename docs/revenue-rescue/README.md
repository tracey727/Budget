# ON TRACK Revenue Rescue™ — build notes

Revenue Rescue is the second product in this repository. It shares the account
and session tables with the Genevieve budget app — one sign-in — and nothing
else. Everything it stores lives in `rr_`-prefixed tables, every one of which
carries a `tenant_id`.

**The promise:** upload operational exports, find preventable leakage, show what
needs action, track what was recovered.

Blueprint source: `ON_TRACK_Revenue_Rescue_FULL_BLUEPRINT_2026-09-18`. The
delivered pack is kept verbatim in [`blueprint/`](./blueprint); the specs,
governance files and sample CSVs alongside it are the live copies.

---

## Where it is

| What | Where |
|---|---|
| Entry point | `/rescue` (sign in first; a link sits in the budget app nav) |
| Domain and rules | `src/lib/rescue/` |
| Rule pack | `src/lib/rescue/rules/` |
| Database schema | `src/lib/db/schema.ts` (from `rr_tenants` down) |
| Migration | `drizzle/0004_quiet_queen_noir.sql` |
| Screens | `src/app/rescue/` |
| Exports | `src/app/api/rescue/exports/[kind]` |
| Tests | `tests/rescue-rules.test.ts`, `tests/rescue-import.test.ts`, `tests/rescue-governance.test.ts` |

## The journey, end to end

Upload → Map → Validate → Commit → Detect → Prioritise → Action → Confirm
recovery → Report. Every step is built:

1. **Import Centre** (`/rescue/imports`) — CSV and Excel (.xlsx) upload for six
   source types, with a SHA-256 duplicate warning. The file itself is never
   retained; only the rows and the hash.
2. **Mapping wizard** — canonical field, your column, an example value from your
   own file. The suggestion is pre-filled and never acted on by itself.
3. **Validation** — VALID / INVALID / HOLD, with a row-level reason for each
   rejection. Nothing is silently coerced.
4. **Commit** — valid rows only, upserted on a tenant-scoped natural key, so
   re-importing a corrected export updates rather than duplicates.
5. **Detection** (`/rescue/rules`) — ten deterministic rules, each versioned,
   each recording the logic hash that produced the finding.
6. **Findings and queue** (`/rescue/findings`, `/rescue/queue`) — RED / AMBER /
   GREEN / HOLD, exceptions first.
7. **Finding detail** — the explanation, the calculation, the evidence, why that
   priority, the action history and the recovery history.
8. **Recovery** — confirmed by a person against evidence, immutable once posted,
   corrected only by reversal.
9. **Dashboard** (`/rescue`) — headline figures, recovery over time, open
   findings by rule, top outstanding actions.
10. **Audit** (`/rescue/audit`) — every material mutation, read-only.
11. **Exports** — findings, actions, recovery and audit as CSV.

## The three ideas that shape the code

**Tenancy is not a filter, it is the contract.** Every customer-domain table has
`tenant_id`; every query includes it. A tenant ID from a client is never trusted
on its own — the cookie only chooses between workspaces the signed-in person
already belongs to (`src/lib/rescue/tenant.ts`).

**HOLD is a real answer.** Where the imported data contradicts itself, the
product says so instead of guessing: an ambiguous `03/04/2026` is held until the
date convention is declared, and a held finding is kept out of every claimed
total and can never carry a recovery.

**Unlike amounts are never added together.** Every finding records a
`value_basis` — money at risk, an outstanding balance, unmatched funds in the
bank, potential value, or a possible duplicate. Only the first two reach the
headline figure; the rest are shown separately and labelled.

## The rule pack

| Rule | What it finds |
|---|---|
| RR-AH-001 | Cancelled slot with no replacement booking |
| RR-AH-002 | No-show or late cancellation with no recorded outcome |
| RR-AH-003 | Completed service with no matching invoice |
| RR-AH-004 | Overdue invoice with no recent follow-up |
| RR-AH-005 | Payment received but not allocated |
| RR-AH-006 | Referral that never progressed |
| RR-AH-007 | Slot went unfilled while people were waiting |
| RR-AH-008 | Overdue revenue-related task |
| RR-AH-009 | Duplicate invoice candidate |
| RR-AH-010 | Records that contradict themselves (always HOLD) |

Double counting is handled explicitly rather than hoped away: a late
cancellation carries no value under RR-AH-002 because RR-AH-001 already counts
the empty slot, and an overdue task chasing an invoice carries no value because
RR-AH-004 already counts the balance. Both say so in the finding text.

## Roles

| Role | May |
|---|---|
| Owner / Admin | Everything, including members and thresholds |
| Manager | Import, detect, assign, dismiss, record recovery, export |
| Reviewer | Work assigned findings. Cannot dismiss or confirm recovery |
| Auditor | Read everything, including the audit trail. Change nothing |

## Running it

```bash
npm install
npm test                       # 358 assertions, no database needed
DATABASE_URL="postgres://…" npm run db:migrate
npm run dev                    # then open /rescue
```

A new workspace can be created with synthetic demonstration data — invented
records only, flagged on screen and in every export filename. It produces the
full commercial demo: a cancelled slot, a completed service with no invoice, an
overdue invoice, a stalled referral, an unmatched payment and a duplicate
candidate, ready for assignment and a confirmed recovery.

## Deliberate deviations from the blueprint

| Blueprint says | Built | Why |
|---|---|---|
| REST endpoints under `/api/...` | Next.js server actions for mutations; CSV exports remain HTTP routes | Same authorisation path, one less public surface. Every action checks tenant *and* capability server-side, so a button rendered by mistake still fails closed. |
| `rule_definitions` / `rule_versions` tables | Rules are versioned in source; every finding stores `rule_id`, `rule_version` and `rule_logic_hash` | The governance requirement is that history keeps its own provenance, which the per-finding stamp satisfies directly. A finding key includes its rule version, so a version bump raises a new finding instead of rewriting an old one. |
| Monorepo layout (`apps/`, `packages/`) | One Next.js app, with rule logic isolated in `src/lib/rescue/` and no imports from UI or billing | The package boundary that matters — detection independent of presentation — is kept. A second deployable unit would have been ceremony. |
| Twelve sequential phase branches | Built on one branch | The instruction for this session was to build the app on the Revenue Rescue branch. Phase content is all present; the phase-by-phase PR gates were not run. See the status table below. |
| R2 for uploaded files | No object storage | Rows are parsed at upload and the file is discarded, which is the data-minimisation position the security baseline asks for. |

## Status against the phase register

| Phase | Built |
|---|---|
| 0 Commercial / product baseline | Yes — this pack, in-repo |
| 1 Security, privacy, tenancy | Yes — tenants, memberships, roles, capability checks, audit |
| 2 Canonical data model | Yes — 20 tables, migrations 0004 and 0005 |
| 3 Import, mapping, validation | Yes — CSV and .xlsx |
| 4 Detection engine | Yes — versioned, idempotent, failure-isolated |
| 5 Allied-health rule pack | Yes — all ten rules, with golden fixtures |
| 6 Action queue and workflow | Yes |
| 7 Recovery tracker and dashboard | Yes |
| 8 Responsive app and demo tenant | Yes |
| 9 Reports, exports, evidence | Yes — four CSV exports, audit trail |
| 10 Pilot and commercial readiness | Not started — commercial, not code |
| 11 Production hardening and launch | Not started — needs a real deployment, load and penetration testing |

## Reading spreadsheets

`.xlsx` is read directly, with no dependency: a workbook is a ZIP of XML, and
`DecompressionStream("deflate-raw")` is already in both Node and Workers. That
matters here because this code opens files that arrive from outside, and the
popular spreadsheet library has a long history of parser advisories.

What the reader refuses to guess is the point of it:

- A number only becomes a **date** if the cell's number format says so. Excel
  stores dates as serial numbers, and `46266` is meaningless without that
  format. Both the 1900 and Mac 1904 date systems are handled, and quoted text
  inside a format code (`0.00"my total"`) is not mistaken for a date pattern.
- A workbook has **no timezone**, so a date and time is handed on without one
  and resolved against the tenant's declared timezone — the same path a bare
  CSV timestamp takes.
- A **formula whose result Excel never cached** is held, not evaluated and not
  dropped, with a message saying to let the workbook recalculate and save again.
- An **error cell** (`#REF!`, `#N/A`) is held and named, rather than read as the
  text "#REF!".
- Only the **first worksheet** is read, and the import screen says which sheet
  that was and how many others it passed over.

## Known gaps

- **Cross-tenant tests are structural, not executed.** Every query is
  tenant-scoped and every mutation re-reads its target with a `tenant_id`
  predicate, but the security test plan asks for live cross-tenant denial tests,
  and those need a database in CI.
- **No transactions across statements.** The Neon HTTP driver is one round trip
  per statement. A detection run interrupted midway leaves earlier findings
  written; a re-run is idempotent and repairs it, but this is a known property
  rather than a designed one.
- **Rule runs are synchronous.** Fine at pilot volumes; a queue is needed before
  a tenant with hundreds of thousands of rows.
