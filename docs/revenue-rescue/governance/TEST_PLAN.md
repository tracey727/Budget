# Test Plan

## Unit tests
- Mapping transformations
- Date/currency parsing
- Rule eligibility
- Rule calculations
- Priority score
- Recovery reconciliation

## Integration tests
- Upload → map → validate → commit
- Commit → rule run → finding
- Finding → action → recovery
- Export reconciliation

## Security tests
- Cross-tenant read denial
- Cross-tenant write denial
- Role permission denial
- Unauthenticated denial
- Malformed upload handling

## Golden rule fixtures
Each detection rule gets:
- positive case
- negative case
- boundary case
- HOLD/ambiguous case
- idempotency case

## Data integrity tests
- Numeric currency precision
- Duplicate import detection
- Duplicate finding prevention
- Recovery cannot be counted twice
- Historical rule version remains intact

## Launch regression
Run full suite on exact release commit before production promotion.
