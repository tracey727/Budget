# ON TRACK Revenue Rescue™ — MASTER BLUEPRINT

## 1. Product definition

### 1.1 Product name
**ON TRACK Revenue Rescue™**

### 1.2 Commercial one-line promise
**Find the money and operational work falling through the cracks, show what needs action first, and track what gets recovered.**

### 1.3 Core business outcome
The product converts operational exports into an evidence-based queue of potential leakage and unresolved actions. It does not claim every flagged dollar is recoverable. It separates:
- Potential value at risk
- Confirmed leakage
- Confirmed recovered value
- Dismissed / not recoverable
- Unknown / needs review

### 1.4 Initial customer
Small to medium psychology, allied-health and NDIS provider businesses, especially practices with multiple practitioners, cancellations, waitlists, invoices, referrals and recurring follow-up work.

### 1.5 V1 user roles
- Owner / Administrator
- Manager
- Operations Reviewer
- Read-only Auditor

### 1.6 Core V1 modules
1. Import Centre
2. Mapping & Validation
3. Detection Engine
4. Action Queue
5. Case / Finding Detail
6. Recovery Tracker
7. Money Saved Dashboard
8. Audit Log
9. Tenant, user and permission controls
10. Export / evidence pack

---

# 2. V1 scope freeze

## Included
- Tenant creation and isolated data.
- Role-based access.
- CSV/XLSX imports.
- Reusable import templates.
- Column mapping and validation.
- Canonical operational records.
- Rule-based leakage detection.
- Explainable findings.
- Priority scoring using documented rules.
- Action assignment, due dates and statuses.
- Recovery confirmation by an authorised human.
- Dashboard totals.
- CSV/PDF-ready export data (PDF rendering may be added after MVP if it delays launch).
- Full audit trail.
- Demo tenant and synthetic demo data.

## Explicitly excluded from V1
- Bank feeds.
- Accounting API integrations.
- Practice-management API integrations.
- Automated debt collection.
- Automatic billing/refunds.
- Clinical or healthcare decision support.
- Autonomous financial advice.
- Predictive AI scoring.
- Email ingestion.
- Slack ingestion.
- Native mobile app.
- Multi-industry rule packs beyond the first allied-health pack.

---

# 3. Non-negotiable operating principles

1. **Explainability first** — every finding shows the source records and rule that created it.
2. **Human authority preserved** — the system recommends review/action but does not execute financial or clinical decisions.
3. **UNKNOWN/HOLD safety state** — ambiguous data is never forced into a confident result.
4. **No invented money** — value at risk is calculated from provided evidence only.
5. **Auditability** — every material action is timestamped and attributable.
6. **Tenant isolation** — one customer cannot see another customer’s data.
7. **Data minimisation** — import only what is needed for a rule.
8. **Fast first value** — a new customer should be able to upload a supported export and receive a useful result without a custom software integration.

---

# 4. Technical architecture

## 4.1 Approved stack
- Front end: Cloudflare Pages or Workers static assets / framework deployment.
- API: Cloudflare Workers.
- Database: Neon Postgres.
- Source control: private GitHub repository.
- CI: GitHub Actions.
- Object/file storage: Cloudflare R2 where required for temporary import artefacts.
- Authentication: secure standards-based authentication compatible with Cloudflare/Workers architecture; implementation must preserve tenant isolation and auditable identities.

## 4.2 Environment model
- local
- preview
- production

Production data must never be copied into demo or preview.

## 4.3 Logical flow
1. User signs in.
2. User uploads CSV/XLSX.
3. System virus/type/size checks file.
4. Import parser reads headers and sample rows.
5. User maps columns to canonical fields.
6. Validation engine classifies rows: VALID / INVALID / HOLD.
7. Valid data is normalised and stored.
8. Detection rules run against eligible data.
9. Findings are created with rule version, evidence and estimated value.
10. Findings enter the action queue.
11. Human reviews, assigns and resolves.
12. Confirmed recovery is recorded separately from estimated value.
13. Dashboard recomputes totals.
14. Audit events preserve the chain of evidence.

---

# 5. Canonical V1 data domains

- tenants
- users
- memberships
- import_jobs
- import_files
- import_templates
- import_mappings
- import_rows
- customers_or_clients
- practitioners_or_workers
- appointments
- invoices
- invoice_items
- payments
- referrals
- waitlist_entries
- operational_tasks
- findings
- finding_evidence
- actions
- recovery_events
- dismissals
- rule_definitions
- rule_versions
- audit_events

Full field-level model is in `specs/DATA_MODEL.md`.

---

# 6. Initial allied-health detection pack

The MVP should support these rules first:

### RR-AH-001 — Cancelled appointment with no documented refill
Flag a cancelled appointment where no replacement appointment is linked to the released slot within the configured window.

### RR-AH-002 — No-show / late cancellation requiring review
Flag eligible appointment outcomes for a human to decide whether a fee, reschedule, waiver or other action is appropriate. The system does not decide that a fee is owed.

### RR-AH-003 — Completed service without matched invoice
Flag a completed service record with no matched invoice after a configurable delay.

### RR-AH-004 — Invoice overdue with no recent follow-up
Flag an unpaid invoice beyond the configured due period where there is no recent follow-up action in the imported data.

### RR-AH-005 — Payment received but not matched
Flag payments that cannot be matched to an invoice using supported deterministic matching rules.

### RR-AH-006 — Referral not progressed
Flag a referral received but not accepted, declined, booked or closed within the configured period.

### RR-AH-007 — Waitlist opportunity missed
Flag an open waitlist candidate compatible with an available/cancelled slot when no outcome is recorded.

### RR-AH-008 — Operational task overdue
Flag a high-value or revenue-related task that is overdue and unresolved.

### RR-AH-009 — Duplicate invoice candidate
Flag likely duplicate invoices using deterministic comparisons; always requires human review.

### RR-AH-010 — Inconsistent status chain
Place a record on HOLD when statuses conflict, required fields are missing, or timestamps imply an impossible sequence.

Full rule contracts are in `specs/DETECTION_RULES.md`.

---

# 7. Priority model

Priority is transparent and rule-based.

Suggested V1 formula:

`priority_score = value_score + age_score + urgency_score + confidence_score`

Where:
- value_score: 0–40
- age_score: 0–25
- urgency_score: 0–20
- confidence_score: 0–15

Priority bands:
- RED: 75–100
- AMBER: 45–74
- GREEN: 0–44
- HOLD: insufficient or contradictory evidence

The UI must also show the underlying factors. Do not display the score without the explanation.

---

# 8. Core screens

1. Sign in
2. Tenant / organisation setup
3. Dashboard
4. Import Centre
5. Mapping wizard
6. Validation results
7. Findings list
8. Finding detail
9. Action Queue
10. Recovery confirmation
11. Rule settings
12. Users and permissions
13. Audit log
14. Exports
15. Demo / sample-data reset for demonstration tenant

Detailed UI behaviour is in `specs/UI_SCREEN_SPEC.md`.

---

# 9. BUILD PLAN — STRICT CHRONOLOGICAL ORDER

## Phase 0 — Commercial, product and repository baseline
**Branch:** `phase-0-commercial-product-baseline`

### 0.1 Product identity
Lock product name, ownership, one-line promise and V1 target market.

### 0.2 V1 scope freeze
Commit the scope freeze and explicit exclusions.

### 0.3 Repository baseline
Create private GitHub repository, README, CODEOWNERS, branch protection plan, issue templates and pull-request template.

### 0.4 Decision log
Create immutable-style decision chronology for architecture and scope decisions.

### 0.5 Phase register
Create machine-readable phase status file.

### 0.6 GREEN gate
Pass when product identity, scope, repository governance and build chronology are committed and reviewed.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_0_GREEN_CLOSED.zip`

---

## Phase 1 — Security, privacy and tenancy foundation
**Branch:** `phase-1-security-privacy-tenancy`

### 1.1 Threat and data classification
Classify imported operational, personal and financial-adjacent data.

### 1.2 Tenant model
Implement tenant IDs and mandatory tenant scoping.

### 1.3 Authentication foundation
Implement sign-in and session handling.

### 1.4 Role-based access
Owner/Admin, Manager, Reviewer, Auditor.

### 1.5 Audit event framework
Create append-oriented audit event model.

### 1.6 Retention and deletion controls
Define configurable retention and controlled deletion processes.

### 1.7 Security baseline tests
Test cross-tenant access denial, unauthenticated denial and role restrictions.

### 1.8 GREEN gate
No known tenant-isolation failure; required security tests pass.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_1_GREEN_CLOSED.zip`

---

## Phase 2 — Database and canonical data model
**Branch:** `phase-2-canonical-data-model`

### 2.1 Core organisation tables
Tenants, users, memberships.

### 2.2 Import tables
Jobs, files, templates, mappings, rows and validation outcomes.

### 2.3 Operational domain tables
Appointments, invoices, payments, referrals, waitlist and tasks.

### 2.4 Findings tables
Findings, evidence, rule version, confidence and value-at-risk.

### 2.5 Action and recovery tables
Actions, assignments, status history, recovery events and dismissals.

### 2.6 Audit tables
Actor, event, entity, old/new state metadata and timestamps.

### 2.7 Constraints and indexes
Foreign keys, tenant-aware uniqueness, money precision, timestamp and lookup indexes.

### 2.8 Migration validation
Fresh database migration and rollback/reapply test strategy.

### 2.9 GREEN gate
Schema builds cleanly and tenant constraints are verified.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_2_GREEN_CLOSED.zip`

---

## Phase 3 — Import Centre, CSV/XLSX parsing and validation
**Branch:** `phase-3-import-mapping-validation`

### 3.1 Upload endpoint
Controlled CSV/XLSX upload with supported size/type limits.

### 3.2 Header and sample inspection
Return headers, detected types and sample rows.

### 3.3 Mapping wizard
Map source columns to canonical fields.

### 3.4 Mapping templates
Save reusable mappings by source/export type.

### 3.5 Row validation
VALID / INVALID / HOLD classification.

### 3.6 Duplicate import protection
File fingerprint plus tenant/source/time checks.

### 3.7 Import commit
Only validated rows enter canonical tables.

### 3.8 Import evidence
Preserve import job summary, mapping version and row counts.

### 3.9 GREEN gate
Synthetic test files import deterministically; invalid data cannot silently pass.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_3_GREEN_CLOSED.zip`

---

## Phase 4 — Detection engine foundation
**Branch:** `phase-4-detection-engine-foundation`

### 4.1 Rule contract
Define input domain, eligibility, logic, outputs and hold conditions.

### 4.2 Rule registry
Create rule IDs and versions.

### 4.3 Deterministic runner
Run enabled rules for one tenant/import scope.

### 4.4 Evidence snapshot
Each finding records exactly which source records produced it.

### 4.5 Value-at-risk calculation
Calculate only from explicit imported values or documented formulas.

### 4.6 Confidence classification
HIGH / MEDIUM / LOW / HOLD based on data completeness and rule-specific logic.

### 4.7 Idempotency
Repeated rule runs must not create duplicate open findings for the same condition.

### 4.8 GREEN gate
Golden test fixtures produce expected findings and evidence.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_4_GREEN_CLOSED.zip`

---

## Phase 5 — Allied-health leakage rule pack
**Branch:** `phase-5-allied-health-rule-pack`

### 5.1 RR-AH-001 cancelled slot not refilled
### 5.2 RR-AH-002 no-show / late cancellation review
### 5.3 RR-AH-003 completed service without matched invoice
### 5.4 RR-AH-004 overdue invoice without recent follow-up
### 5.5 RR-AH-005 unmatched payment
### 5.6 RR-AH-006 referral not progressed
### 5.7 RR-AH-007 waitlist opportunity missed
### 5.8 RR-AH-008 overdue revenue-related task
### 5.9 RR-AH-009 duplicate invoice candidate
### 5.10 RR-AH-010 inconsistent status chain → HOLD
### 5.11 Rule-pack regression fixtures
### 5.12 GREEN gate
All rule fixtures pass and every rule exposes an explanation.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_5_GREEN_CLOSED.zip`

---

## Phase 6 — Action Queue and workflow controls
**Branch:** `phase-6-action-queue-workflow`

### 6.1 Queue list
Filter by priority, value, rule, assignee, age and status.

### 6.2 Finding detail
Show explanation, evidence, estimated value and history.

### 6.3 Assign owner
Assign a finding/action to an authorised user.

### 6.4 Due date and next action
Record what needs to happen and by when.

### 6.5 Status model
NEW → REVIEWING → ACTIONED → RESOLVED, with HOLD and DISMISSED paths.

### 6.6 Required dismissal reason
A dismissed finding requires a reason.

### 6.7 Notes and evidence links
Human-entered notes are attributable and timestamped.

### 6.8 Overdue escalation marker
Mark overdue RED/AMBER actions for management-by-exception.

### 6.9 GREEN gate
A user can take a finding from detection through controlled resolution with full history.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_6_GREEN_CLOSED.zip`

---

## Phase 7 — Recovery Tracker and Money Saved Dashboard
**Branch:** `phase-7-recovery-dashboard`

### 7.1 Recovery event
Record confirmed recovered amount, date, source and authorised confirmer.

### 7.2 Partial recovery
Allow multiple recovery events up to the defensible amount.

### 7.3 Recovery reconciliation
Prevent double counting.

### 7.4 Dashboard headline metrics
- Potential value at risk
- Confirmed leakage reviewed
- Confirmed recovered
- Still outstanding
- Dismissed/not recoverable
- HOLD value excluded from claims

### 7.5 Trend view
Daily/weekly/monthly recovered and outstanding values.

### 7.6 Rule contribution
Show which rules identify the most value/actions.

### 7.7 Audit-safe wording
Never label estimated money as “saved” until confirmed by an authorised human.

### 7.8 GREEN gate
Dashboard totals reconcile to underlying findings and recovery events.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_7_GREEN_CLOSED.zip`

---

## Phase 8 — UX, responsive web app and demo tenant
**Branch:** `phase-8-responsive-app-demo`

### 8.1 Navigation and layout
Responsive desktop/tablet/mobile web layout.

### 8.2 Empty states and guided onboarding
New tenant receives a simple upload-first path.

### 8.3 Demo tenant
Synthetic data only; one-click reset.

### 8.4 Demo story
Preloaded examples showing cancelled slots, missed invoice, overdue referral and confirmed recovery.

### 8.5 Accessibility pass
Keyboard navigation, semantic labels, contrast checks and visible error states.

### 8.6 Error handling
No blank screens; user gets recoverable error messages and reference IDs.

### 8.7 GREEN gate
A first-time user can complete the core flow without developer assistance.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_8_GREEN_CLOSED.zip`

---

## Phase 9 — Reports, exports and management evidence
**Branch:** `phase-9-reports-exports-evidence`

### 9.1 Findings export
CSV export of filtered findings.

### 9.2 Action export
CSV export of outstanding actions and owners.

### 9.3 Recovery report
Period report showing confirmed recovered amounts and evidence references.

### 9.4 Executive summary
Management summary with clear distinction between potential and confirmed values.

### 9.5 Audit export
Authorised export of relevant audit trail.

### 9.6 GREEN gate
Exported totals reconcile with dashboard and database.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_9_GREEN_CLOSED.zip`

---

## Phase 10 — Pilot controls, commercial readiness and billing boundary
**Branch:** `phase-10-pilot-commercial-readiness`

### 10.1 Pilot agreement requirements
Define pilot scope, data responsibilities, support boundary and no-guarantee wording.

### 10.2 Customer onboarding checklist
Tenant, users, data-source exports, mapping verification, baseline date.

### 10.3 Pricing configuration
Support plan labels and billing metadata without embedding payment logic into detection rules.

### 10.4 Usage limits
File/import/tenant limits configurable by plan.

### 10.5 Support workflow
Support requests must not require unrestricted access to customer data.

### 10.6 Pilot success measures
Time to first finding, value reviewed, confirmed recovery, action closure rate and user effort.

### 10.7 GREEN gate
Ready for a controlled pilot using real customer data only after privacy/security/legal checks appropriate to the customer relationship are complete.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_10_GREEN_CLOSED.zip`

---

## Phase 11 — Production hardening and launch gate
**Branch:** `phase-11-production-hardening-launch`

### 11.1 CI required checks
Tests, lint, type check, migration validation, dependency/security checks.

### 11.2 Observability
Structured logs, error IDs, health endpoint and alerting path.

### 11.3 Backup and recovery procedure
Document Neon backup/recovery and critical configuration recovery.

### 11.4 Rate limits and abuse controls
Protect authentication, upload and rule-run endpoints.

### 11.5 Performance baseline
Define acceptable import and queue response targets for pilot-sized datasets.

### 11.6 Production secrets review
No secrets in source or logs.

### 11.7 Disaster / rollback drill
Document and test rollback to prior known-good release.

### 11.8 Final launch gate
Only launch when required checks are GREEN and no unresolved critical security issue remains.

**Required output ZIP:** `ON_TRACK_Revenue_Rescue_PHASE_11_GREEN_CLOSED.zip`

---

# 10. Post-V1 roadmap — do not build before launch gate

## Phase 12 — Direct integrations
Potential connectors for accounting/practice systems after demand is proven.

## Phase 13 — Notifications
Controlled email/task notifications, with tenant-configurable frequency.

## Phase 14 — Multi-industry rule packs
- Dental
- Pharmacy operations
- Service stations / retail
- Trades / field services

## Phase 15 — Portfolio / multi-site command centre
Cross-site benchmarking and management-by-exception without exposing one tenant’s data to another.

## Phase 16 — Advanced anomaly assistance
Only after deterministic rules, explainability and governance are mature. Machine learning or AI may assist review but must not replace evidence or human authority.

---

# 11. Definition of MVP complete

The MVP is complete only when a new pilot customer can:
1. Sign in securely.
2. Create/use its tenant.
3. Upload a supported CSV/XLSX export.
4. Map columns.
5. See validation errors/HOLD rows.
6. Commit valid data.
7. Run the allied-health rule pack.
8. See explainable findings.
9. Assign and action findings.
10. Confirm recovery separately from estimates.
11. View reconciled dashboard totals.
12. Export findings/actions/recovery data.
13. Produce an auditable history.
14. Complete the workflow without developer intervention.

---

# 12. Build discipline

For every phase:
- Create the exact branch named above from current protected `main`.
- Build only that phase.
- Update tests and documentation.
- Regenerate `MANIFEST.txt` if used by the repository standard.
- Run required CI.
- Open PR.
- Merge only when GREEN.
- Create evidence-only closure if that is the established repository governance pattern.
- Produce a full-source ZIP after closure.
- Update `BUILD_STATUS.md` and `PHASE_REGISTER.json`.
- Then move to the next chronological phase.

**Next build from this blueprint: Phase 0 — `phase-0-commercial-product-baseline`.**
