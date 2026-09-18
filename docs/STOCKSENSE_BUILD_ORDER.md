# StockSense™ — Chronological Build Order

Product: **StockSense™ — Inventory, Supply & Waste Control**
Commercial identity: ON TRACK by TRACE
Target repository: `ON-TRACK-Stock-Sense` (private, protected `main`)
Architecture: GitHub + Cloudflare + Neon only
Data path: Cloudflare Worker → Hyperdrive → least-privilege Neon PostgreSQL

Source: `STOCKSENSE_MASTER_CHRONOLOGICAL_BLUEPRINT.md` (Phase 0–20 master blueprint).
This file flattens that blueprint into a single strictly ordered execution list so the
build can be worked top to bottom without re-reading the phase structure each time.

> **Scope note.** This document lives in the Genevieve Budget repository for reference
> only. StockSense is a separate product and must be built in `ON-TRACK-Stock-Sense`.
> No StockSense code belongs in this repository.

---

## The one rule

**One chronological subphase at a time. Never jump ahead.**
Never move to the next phase while the current GREEN gate is RED or AMBER.

---

## The control loop — repeated for every single step below

Every numbered step in this document is executed the same way:

1. Start from the exact latest protected `main`.
2. Audit the previous phase before changing any code.
3. Create the exact branch named in the step (never an improvised name).
4. Build **only** that subphase.
5. Use synthetic data until the authorised pilot/production stage.
6. Regenerate `MANIFEST.txt`.
7. Run the full check set:
   - Tests
   - Lint
   - Type check
   - Migration validation
   - Dependency / security check
   - Secret scan
   - Build validation
   - Cloudflare deployment / dry-run checks where applicable
8. Commit the exact build.
9. Open the PR.
10. Required CI must be GREEN **on the exact head SHA**.
11. Merge only through protected `main`.
12. At the end of the whole phase, create the phase GREEN closure branch.
13. Merge the evidence-only closure PR.
14. Produce the complete full-source ZIP for that phase.
15. Record the exact next chronological phase and exact branch name.

---

## Current position

| | |
|---|---|
| Completed | Phase 0, 1, 2, 3, 4.1, 4.2, 4.3, 4.4, 4.5 build, 4.6 local GREEN gate |
| **Now** | **Step 1 below — Phase 4.7 Required CI** |
| Current branch | `phase-4-5-item-master-csv-import-validation` |
| New branch for this step | **None. Do not create one.** |
| Next closure branch | `phase-4-green-closure` |
| First development branch after Phase 4 | `phase-5-1-stock-movement-service` |

Remaining work: **132 steps** — 114 development branches, 17 GREEN closure branches,
and 1 CI-only step on the existing branch.

---

# PART A — COMPLETED (context only, do not rebuild)

### Phase 0 — Product directive & IP freeze — GREEN / CLOSED
0.1 Product contract · 0.2 Canonical product identity · 0.3 IP boundary ·
0.4 Non-negotiable controls · 0.5 Master feature register · 0.6 Phase 0 GREEN gate

Locked controls: immutable stock movements; tenant isolation; evidence-based savings;
human authority over consequential decisions; no silent automated purchasing.

### Phase 1 — Repository & engineering foundation — GREEN / CLOSED
1.1 Private repository · 1.2 Protected `main` · 1.3 Monorepo structure
(`apps/web`, `apps/api`, `packages/domain`, `packages/rules-engine`, `packages/permissions`,
`packages/audit`, `packages/shared-types`, `database/migrations`, `database/seeds`, `docs`, `tests`) ·
1.4 Toolchain · 1.5 Cloudflare previews · 1.6 Required CI · 1.7 GREEN closure

### Phase 2 — Neon foundation & migration discipline — GREEN / CLOSED
2.1 Neon environments · 2.2 Database roles · 2.3 Identity tables · 2.4 Inventory-master tables ·
2.5 Inventory-ledger tables · 2.6 Audit protections · 2.7 Synthetic seed data ·
2.8 Cross-tenant negative tests · 2.9 GREEN closure

### Phase 3 — Identity, tenant & permission enforcement — GREEN / CLOSED
3.1 Authentication integration · 3.2 Membership resolution · 3.3 Permission middleware ·
3.4 `/v1/me` · 3.5 Privileged-action auditing · 3.6 Allow/deny permission matrix testing ·
3.7 GREEN closure

### Phase 4 (part) — Inventory master data — CLOSED SUBPHASES
4.1 Items, categories, units & identifiers API — `phase-4-1-items-categories-units-identifiers-api`
4.2 Unit conversion & explicit base unit — `phase-4-2-unit-conversion-explicit-base-unit`
4.3 Storage locations & category controls — `phase-4-3-storage-locations-category-controls`
4.4 Inventory master screens & barcode lookup — `phase-4-4-inventory-master-screens-barcode-lookup`
4.5 Item master CSV import validation — `phase-4-5-item-master-csv-import-validation` (BUILT)
4.6 Phase 4 local GREEN gate — PASSED, remained on the 4.5 branch

---

# PART B — THE REMAINING ORDER (execute top to bottom)

## Phase 4 — Inventory master data (closing out)

**1. Phase 4.7 — Required CI** — branch: *none, stay on* `phase-4-5-item-master-csv-import-validation`
Run Required CI against the exact final head. **Do not alter the head after the GREEN CI result.**

**2. Phase 4.8 — Protected-main merge & Phase 4 closure** — branch: `phase-4-green-closure`
Merge the 4.5/4.6 head through protected `main` → confirm the exact merged SHA → create the
closure branch → add Phase 4 closure evidence only → Required CI → merge the closure PR →
produce the Phase 4 GREEN CLOSED full-source ZIP.

> **PHASE 4 GREEN GATE.** Items can be created. Items can be imported. Units reconcile
> correctly. Duplicate identifiers are rejected. Ambiguous identifiers are rejected. Tenant
> isolation works. Site isolation works. Import failures do not partially corrupt data.
> **Only then start Phase 5.**

## Phase 5 — Immutable stock movement engine

**3.** 5.1 Stock movement service — `phase-5-1-stock-movement-service`
**4.** 5.2 Core movement types (RECEIPT, ISSUE, OPENING_BALANCE, REVERSAL) — `phase-5-2-core-movement-types`
**5.** 5.3 Atomic movement transactions (validate → movement insert → balance update → audit event → domain event) — `phase-5-3-atomic-movement-transactions`
**6.** 5.4 Negative stock & batch eligibility — `phase-5-4-negative-stock-batch-eligibility`
**7.** 5.5 Movement history & balance screens — `phase-5-5-movement-history-balance-screens`
**8.** 5.6 Concurrency protection — `phase-5-6-stock-concurrency-controls`
**9.** 5.7 Phase 5 GREEN closure — `phase-5-green-closure`

> **GATE.** Ledger = balances under receipt, issue, reversal and concurrency scenarios.
> Posted movements cannot be edited or deleted by normal runtime authority. Produce Phase 5 ZIP.

## Phase 6 — Transfers, quarantine & stock counts

**10.** 6.1 Transfers — `phase-6-1-stock-transfers`
**11.** 6.2 Quarantine — `phase-6-2-quarantine-controls`
**12.** 6.3 Count sessions — `phase-6-3-count-sessions`
**13.** 6.4 Blind count & variance review — `phase-6-4-blind-count-variance-review`
**14.** 6.5 Controlled count adjustment — `phase-6-5-count-adjustment-approval`
**15.** 6.6 Mobile count/transfer UI — `phase-6-6-mobile-count-transfer-ui`
**16.** 6.7 GREEN closure — `phase-6-green-closure`

## Phase 7 — Purchasing & supplier core

**17.** 7.1 Supplier master — `phase-7-1-supplier-master`
**18.** 7.2 Supplier items, packs & pricing — `phase-7-2-supplier-items-pack-pricing`
**19.** 7.3 Purchase order workflow — `phase-7-3-purchase-order-workflow`
**20.** 7.4 Goods receipt — `phase-7-4-goods-receipt`
**21.** 7.5 PO discrepancy capture — `phase-7-5-purchase-discrepancy-controls`
**22.** 7.6 Effective unit cost — `phase-7-6-effective-unit-cost`
**23.** 7.7 Supplier & PO screens — `phase-7-7-supplier-po-ui`
**24.** 7.8 GREEN closure — `phase-7-green-closure`

## Phase 8 — Expiry, batch & recall

**25.** 8.1 Category batch/expiry rules — `phase-8-1-batch-expiry-category-controls`
**26.** 8.2 Batch management — `phase-8-2-batch-management`
**27.** 8.3 FEFO — `phase-8-3-fefo-eligibility`
**28.** 8.4 Expiry sweep — `phase-8-4-expiry-sweep`
**29.** 8.5 Expiry exposure — `phase-8-5-expiry-exposure`
**30.** 8.6 Recall notice & matching — `phase-8-6-recall-matching`
**31.** 8.7 Recall quarantine — `phase-8-7-recall-quarantine`
**32.** 8.8 Recall disposition — `phase-8-8-recall-disposition`
**33.** 8.9 RED alert integration — `phase-8-9-recall-expiry-alerts`
**34.** 8.10 GREEN closure — `phase-8-green-closure`

## Phase 9 — Waste, damage & loss intelligence

**35.** 9.1 Waste movement — `phase-9-1-waste-movement`
**36.** 9.2 Waste reasons & evidence — `phase-9-2-waste-reasons-evidence`
**37.** 9.3 Waste centre — `phase-9-3-waste-centre`
**38.** 9.4 Count-variance loss cases — `phase-9-4-loss-cases`
**39.** 9.5 Pattern detection — `phase-9-5-loss-pattern-detection`
**40.** 9.6 Recommendations — `phase-9-6-waste-loss-recommendations`
**41.** 9.7 GREEN closure — `phase-9-green-closure`

## Phase 10 — GREEN / AMBER / RED accountability engine

**42.** 10.1 Alert model — `phase-10-1-alert-model`
**43.** 10.2 Severity rules — `phase-10-2-alert-severity-rules`
**44.** 10.3 Alert generation — `phase-10-3-alert-generation`
**45.** 10.4 Ownership workflow — `phase-10-4-alert-ownership`
**46.** 10.5 Escalation — `phase-10-5-alert-escalation`
**47.** 10.6 Recovery state — `phase-10-6-alert-recovery`
**48.** 10.7 Alert inbox — `phase-10-7-alert-inbox`
**49.** 10.8 GREEN closure — `phase-10-green-closure`

## Phase 11 — Verified savings ledger

**50.** 11.1 Savings schema — `phase-11-1-savings-schema`
**51.** 11.2 Savings state machine (Potential → Approved → Implemented → Measured → Verified) — `phase-11-2-savings-state-machine`
**52.** 11.3 Versioned calculations — `phase-11-3-savings-calculations`
**53.** 11.4 No-double-counting controls — `phase-11-4-savings-double-count-controls`
**54.** 11.5 Verification permissions — `phase-11-5-savings-verification-permissions`
**55.** 11.6 Evidence review — `phase-11-6-savings-evidence-review`
**56.** 11.7 Savings dashboard — `phase-11-7-savings-dashboard`
**57.** 11.8 GREEN closure — `phase-11-green-closure`

## Phase 12 — Reorder & forecasting v1

**58.** 12.1 Usage calculation — `phase-12-1-average-usage-calculation`
**59.** 12.2 Abnormal event filtering — `phase-12-2-abnormal-usage-filtering`
**60.** 12.3 Lead-time demand — `phase-12-3-lead-time-demand`
**61.** 12.4 Safety stock & reorder point — `phase-12-4-safety-stock-reorder-point`
**62.** 12.5 Incoming stock adjustment — `phase-12-5-open-po-in-transit-adjustment`
**63.** 12.6 Supplier pack normalisation — `phase-12-6-reorder-pack-normalisation`
**64.** 12.7 Reorder explanation UI — `phase-12-7-reorder-explanation-ui`
**65.** 12.8 Suggestion → draft PO — `phase-12-8-suggestion-draft-po`
**66.** 12.9 GREEN closure — `phase-12-green-closure`

## Phase 13 — Cold chain & hazard controls

**67.** 13.1 Temperature rules — `phase-13-1-temperature-rules`
**68.** 13.2 Temperature reading ingestion — `phase-13-2-temperature-ingestion`
**69.** 13.3 Excursion grouping — `phase-13-3-temperature-excursions`
**70.** 13.4 Affected-stock quarantine — `phase-13-4-excursion-quarantine`
**71.** 13.5 Hazard metadata — `phase-13-5-hazard-metadata`
**72.** 13.6 Restricted hazard visibility — `phase-13-6-hazard-permissions`
**73.** 13.7 Device deduplication — `phase-13-7-device-event-deduplication`
**74.** 13.8 GREEN closure — `phase-13-green-closure`

## Phase 14 — Reporting, exports & executive dashboard

**75.** 14.1 Executive dashboard — `phase-14-1-executive-dashboard`
**76.** 14.2 Inventory reports — `phase-14-2-inventory-reports`
**77.** 14.3 Waste & expiry reports — `phase-14-3-waste-expiry-reports`
**78.** 14.4 Supplier & purchasing reports — `phase-14-4-supplier-purchasing-reports`
**79.** 14.5 Savings reports — `phase-14-5-savings-reports`
**80.** 14.6 Asynchronous exports — `phase-14-6-async-exports`
**81.** 14.7 Report permission enforcement — `phase-14-7-report-permissions`
**82.** 14.8 Audit export — `phase-14-8-audit-export`
**83.** 14.9 GREEN closure — `phase-14-green-closure`

## Phase 15 — PWA, offline & scanner hardening

**84.** 15.1 PWA shell — `phase-15-1-pwa-shell`
**85.** 15.2 Safe reference caching — `phase-15-2-safe-reference-cache`
**86.** 15.3 Offline draft queue — `phase-15-3-offline-draft-queue`
**87.** 15.4 Scan idempotency — `phase-15-4-scan-idempotency`
**88.** 15.5 Reconnect revalidation — `phase-15-5-reconnect-revalidation`
**89.** 15.6 Conflict UI — `phase-15-6-offline-conflict-ui`
**90.** 15.7 Scanner compatibility — `phase-15-7-scanner-compatibility`
**91.** 15.8 GREEN closure — `phase-15-green-closure`

## Phase 16 — Security hardening & threat model

**92.** 16.1 Threat model — `phase-16-1-threat-model`
**93.** 16.2 Dependency/security remediation — `phase-16-2-security-remediation`
**94.** 16.3 Rate limits & abuse controls — `phase-16-3-rate-limits-abuse-controls`
**95.** 16.4 Security logging — `phase-16-4-security-logging`
**96.** 16.5 Secret & credential review — `phase-16-5-secrets-runtime-role-review`
**97.** 16.6 Backup & restore test — `phase-16-6-backup-restore`
**98.** 16.7 Incident runbook — `phase-16-7-incident-runbook`
**99.** 16.8 GREEN closure — `phase-16-green-closure`

## Phase 17 — Performance & scale verification

**100.** 17.1 Large synthetic dataset — `phase-17-1-scale-fixtures`
**101.** 17.2 API load testing — `phase-17-2-api-load-testing`
**102.** 17.3 Dashboard/report load testing — `phase-17-3-report-load-testing`
**103.** 17.4 Database query & index review — `phase-17-4-neon-query-index-tuning`
**104.** 17.5 Hyperdrive tuning — `phase-17-5-hyperdrive-capacity`
**105.** 17.6 High-contention concurrency testing — `phase-17-6-high-contention-concurrency`
**106.** 17.7 GREEN closure — `phase-17-green-closure`

## Phase 18 — Synthetic UAT & NightOwl pilot readiness

**107.** 18.1 Synthetic retail tenant — `phase-18-1-nightowl-synthetic-tenant`
**108.** 18.2 End-to-end workflow — `phase-18-2-end-to-end-uat`
**109.** 18.3 Recall drill — `phase-18-3-recall-drill`
**110.** 18.4 Count/loss drill — `phase-18-4-count-loss-drill`
**111.** 18.5 Offline drill — `phase-18-5-offline-reconnect-drill`
**112.** 18.6 NightOwl pilot configuration — `phase-18-6-nightowl-pilot-configuration`
  Pilot rules: one NightOwl site · 30-day proof-of-value · existing POS/order systems remain ·
  CSV-first · alerts and recommendations · no uncontrolled automatic ordering ·
  measure savings and operational value.
**113.** 18.7 Defect closure — `phase-18-7-uat-defect-closure`
**114.** 18.8 Pilot readiness GREEN closure — `phase-18-green-closure`

## Phase 19 — Controlled production / NightOwl pilot deployment

**115.** 19.1 Production release controls — `phase-19-1-production-release-controls`
**116.** 19.2 Production Neon migration — `phase-19-2-production-migrations`
**117.** 19.3 Hyperdrive runtime binding — `phase-19-3-production-hyperdrive`
**118.** 19.4 Production Cloudflare bindings — `phase-19-4-production-cloudflare-bindings`
**119.** 19.5 API deployment — `phase-19-5-production-api`
**120.** 19.6 Web deployment — `phase-19-6-production-web`
**121.** 19.7 Production smoke tests — `phase-19-7-production-smoke-tests`
**122.** 19.8 30-day pilot evidence — `phase-19-8-nightowl-30-day-pilot`
  Measure: stock accuracy · waste · expiry · stockouts · overstock · emergency purchasing ·
  staff interventions · supplier/purchasing opportunities · measurable savings.
**123.** 19.9 Pilot outcome report — `phase-19-9-nightowl-pilot-outcome`
**124.** 19.10 Release GREEN closure — `phase-19-green-closure`

## Phase 20 — Module integration, licensing & commercial scale

**125.** 20.1 StockSense entitlement — `phase-20-1-stock-sense-entitlement`
**126.** 20.2 Licence enforcement — `phase-20-2-licence-enforcement`
**127.** 20.3 Navigation entitlement — `phase-20-3-navigation-entitlement`
**128.** 20.4 Shared-service contracts — `phase-20-4-shared-service-contracts`
**129.** 20.5 API/event integration contract — `phase-20-5-api-event-contract`
**130.** 20.6 Tenant data isolation across products — `phase-20-6-cross-module-isolation`
**131.** 20.7 Commercial release pack — `phase-20-7-commercial-release-pack`
**132.** 20.8 Full StockSense v1 GREEN closure — `phase-20-green-closure`

---

# StockSense v1 — definition of done

StockSense is not finished until all of the following hold:

- Tenant and site isolation is proven.
- Item master is reliable.
- Units and conversions are exact.
- Every stock change goes through the immutable ledger.
- Receipts and issues reconcile.
- Transfers reconcile.
- Counts and adjustments are controlled.
- Waste is measurable.
- Loss is investigated without automated accusations.
- Batch/expiry/recall controls work.
- Reorder suggestions are explainable.
- Purchase approvals remain human-controlled.
- Alerts have owners and closure evidence.
- RED alerts cannot silently disappear.
- Verified savings are evidence-based.
- Savings cannot be double-counted.
- Reports reconcile to source records.
- Exports cannot widen permissions.
- Offline replay cannot duplicate stock.
- Security and cross-tenant tests are GREEN.
- Backup/restore is proven.
- Scale/concurrency tests are GREEN.
- Synthetic UAT is GREEN.
- NightOwl pilot is measurable.
- Production lineage is documented.
- Every final release has a full-source ZIP.

---

# Post-v1 — locked until Phase 20 is GREEN

Do not build any of these before v1 closes:

- Advanced forecasting and seasonality
- Predictive stockout modelling
- RFID gateways
- Richer IoT telemetry
- Supplier EDI/API integrations
- Automated catalogue integrations
- Packing-slip/invoice optical ingestion
- Cross-site stock optimisation
- Additional industry packs
- Privacy-preserving benchmarking
- AI stock-status summaries
