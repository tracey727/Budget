# Decision Log

## 2026-09-18 — Product form
Decision: Build Revenue Rescue as a small standalone B2B leakage/action product rather than another broad command centre.
Reason: Faster path to a pilot and clearer measurable value.

## 2026-09-18 — V1 ingestion
Decision: CSV/XLSX first; no direct integrations in V1.
Reason: Removes integration dependency and shortens time to first customer.

## 2026-09-18 — First market
Decision: Psychology, allied-health and NDIS service businesses first.
Reason: Clear workflows for cancellations, invoices, referrals, waitlists and follow-up actions.

## 2026-09-18 — Architecture
Decision: Cloudflare + Neon + GitHub only for core platform.

## 2026-09-18 — Calculation integrity
Decision: Separate potential value from confirmed recovered value.
Reason: Prevents misleading claims and preserves evidence quality.

## 2026-09-18 — Ambiguity
Decision: UNKNOWN/HOLD rather than forced conclusions.

## 2026-09-18 — Repository placement
Decision: Build Revenue Rescue inside the existing Budget repository, sharing only the account and session tables, with every Revenue Rescue table prefixed `rr_` and carrying `tenant_id`.
Reason: One sign-in and one deployment pipeline, with no shared customer data between the two products.

## 2026-09-18 — XLSX deferred — SUPERSEDED
Decision: V1 accepts CSV only. An `.xlsx` upload is refused with instructions to export as CSV UTF-8.
Reason: XLSX needs a parsing dependency and its own formula-cell policy. Refusing plainly is safer than reading a spreadsheet wrongly, and the blueprint already requires HOLD rather than a guess. First item in the post-V1 backlog.
Superseded the same day — see "XLSX supported without a dependency" below.

## 2026-09-18 — XLSX supported without a dependency
Decision: Read `.xlsx` directly, using the runtime's own `DecompressionStream("deflate-raw")` to open the ZIP, rather than adding a spreadsheet library. Closes the V1 scope item deferred earlier today.
Reason: This code opens files that arrive from outside a trust boundary, and the widely used spreadsheet library carries a history of parser advisories and a stale npm release. The parts actually needed — shared strings, inline strings, numbers, dates and formulas on one worksheet — are small enough to own and test outright.

## 2026-09-18 — Spreadsheet ambiguity follows the HOLD rule
Decision: A formula whose result the workbook never cached is HELD, an error cell (`#REF!`, `#N/A`) is HELD and named, and a number becomes a date only when the cell's number format says it is one.
Reason: The same standard applied to ambiguous dates in CSV. A spreadsheet carries more ways to be unclear, not fewer, and none of them justifies a guess.

## 2026-09-18 — Only the first worksheet
Decision: A workbook is read from its first sheet. The import screen names that sheet and says how many others were passed over.
Reason: Importing sheet 1 of 5 in silence is the kind of quiet assumption this product refuses everywhere else. Saying it out loud costs one line.

## 2026-09-18 — Mutation transport
Decision: Mutations use Next.js server actions; exports remain HTTP routes.
Reason: The same authorisation path with one less public surface. Every action independently checks tenant membership and role capability, so a control rendered in error still fails closed.

## 2026-09-18 — Rule versioning storage
Decision: Rules are versioned in source rather than in `rule_definitions` / `rule_versions` tables. Each finding stores rule id, version and logic hash, and the finding key includes the rule version.
Reason: Satisfies the governance requirement directly — a rule change raises new findings instead of rewriting historical ones, and every historical finding names the exact logic that produced it.

## 2026-09-18 — Value basis on every finding
Decision: Every finding records what its amount represents: at risk, outstanding, unmatched, potential, duplicate, or none. Only "at risk" and "outstanding" are summed into the headline figure.
Reason: Unmatched money is already in the bank and potential value has not been earned. Adding them to money at risk would overstate the claim the product exists to make.

## 2026-09-18 — Double-count prevention between rules
Decision: Where two rules describe the same money, only one carries the value, and the other says so in its own text.
Reason: A late cancellation and its empty slot, or an overdue task and the invoice it chases, are one loss, not two.

## 2026-09-18 — No object storage for uploads
Decision: Uploaded files are parsed at upload and discarded; only the rows and a SHA-256 hash are kept.
Reason: Data minimisation. It also removes R2 from the V1 dependency list without losing duplicate detection.
