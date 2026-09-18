# Detection Rule Contracts — Allied Health V1

## Common output contract
Every rule produces:
- rule_id and version
- finding_key
- title
- plain-language explanation
- evidence references
- confidence
- estimated_value or null
- priority inputs
- HOLD reason when applicable

## RR-AH-001 — Cancelled slot not refilled
Eligibility: appointment status indicates cancellation and scheduled slot is known.
Detection: no supported replacement booking is linked/matched to the released time window.
Estimated value: cancelled appointment service_value only when explicitly supplied.
HOLD: value or timing/status evidence is contradictory.

## RR-AH-002 — No-show / late cancellation review
Eligibility: status indicates no-show or configured late cancellation.
Detection: unresolved administrative review.
Estimated value: appointment service_value may be shown as value at risk, never automatically treated as debt owed.
HOLD: cancellation rules/status cannot be established from imported data.

## RR-AH-003 — Completed service without matched invoice
Eligibility: service/appointment marked completed.
Detection: no invoice matched after configured grace period.
Estimated value: explicit service value when available.

## RR-AH-004 — Overdue invoice without recent follow-up
Eligibility: invoice balance > 0 and due date exceeded.
Detection: no imported follow-up action within configured lookback.
Estimated value: current outstanding balance.

## RR-AH-005 — Unmatched payment
Eligibility: payment exists.
Detection: deterministic match to invoice failed.
Estimated value: payment amount is not “lost revenue”; display as unmatched funds requiring review.

## RR-AH-006 — Referral not progressed
Eligibility: referral received.
Detection: no booked/accepted/declined/closed outcome within threshold.
Estimated value: null by default unless customer provides a documented rule; do not invent future revenue.

## RR-AH-007 — Waitlist opportunity missed
Eligibility: compatible open waitlist entry and released/available slot.
Detection: no recorded offer/outcome before slot time.
Estimated value: slot service value where known; label potential only.

## RR-AH-008 — Overdue revenue-related task
Eligibility: task type configured as revenue/continuity relevant.
Detection: due date passed and unresolved.
Estimated value: only imported related_value; otherwise null.

## RR-AH-009 — Duplicate invoice candidate
Eligibility: invoice set contains matching deterministic keys.
Detection examples: same client reference + service date + amount + near-identical invoice creation context.
Estimated value: duplicate candidate amount; never automatically refund or void.
HOLD: competing evidence suggests legitimate split/reissue.

## RR-AH-010 — Inconsistent status chain
Examples:
- payment date before invoice existence with impossible mapping
- resolved item still carrying open-only status
- cancellation recorded after a conflicting completed status with no correction history
Output: HOLD only until human review or corrected source data.

## Rule governance
- Rules are versioned.
- A changed rule must not silently rewrite historical findings.
- Historical finding evidence keeps its original rule version.
- Regression fixtures are mandatory for every rule version.
