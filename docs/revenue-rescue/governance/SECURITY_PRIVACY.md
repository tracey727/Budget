# Security & Privacy Baseline

## Principles
- Least privilege
- Tenant isolation
- Data minimisation
- Explicit retention
- Secure defaults
- Traceable administrative changes

## Required controls
- Authentication required for customer data.
- Role checks server-side.
- Tenant context derived from authorised membership, not blindly trusted request fields.
- Parameterised database access.
- Upload file type/size controls.
- Malware/security scanning strategy before long-lived storage where practical.
- Encryption in transit.
- Provider-managed encryption at rest.
- Secrets outside source control.
- Production access restricted and auditable.
- Support access controlled and time-bounded where implemented.

## Privacy boundary
V1 should not require unnecessary clinical notes or detailed health information. Use operational identifiers and minimum necessary fields for the leakage rules.

## Incident readiness
Maintain:
- security contact path
- incident log
- data exposure assessment checklist
- credential rotation procedure
- containment/rollback procedure
