# MVP Acceptance Criteria

## Onboarding
- Authorised user can sign in.
- User sees only tenants they belong to.
- Owner/Admin can manage authorised users and roles.

## Import
- CSV and XLSX accepted within configured limits.
- Ambiguous/malformed data produces visible INVALID/HOLD results.
- Mapping can be saved as a reusable template.
- Duplicate import is detected/warned.

## Detection
- All ten V1 rules have golden fixtures.
- Every finding contains rule version and evidence.
- Re-running rules is idempotent for the same unresolved condition.
- HOLD is used for contradictory or insufficient evidence.

## Actions
- Findings can be assigned.
- Due dates and next actions can be recorded.
- Overdue RED/AMBER exceptions are visible.
- Dismissal requires a reason.

## Recovery
- Confirmed recovery is separate from estimated value.
- Partial recoveries are supported.
- Double counting is prevented.
- Dashboard reconciles to source recovery events.

## Governance
- Audit trail exists for material mutations.
- Cross-tenant access tests pass.
- Required CI is GREEN on exact release commit.
- Production rollback procedure exists.

## Commercial demo
A synthetic demonstration can show, end to end:
1. cancelled slot
2. completed service lacking invoice
3. overdue invoice
4. referral not progressed
5. action assignment
6. confirmed recovery
7. updated dashboard
