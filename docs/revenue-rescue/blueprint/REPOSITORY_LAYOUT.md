# Proposed Repository Layout

```text
/
  apps/
    web/
    api/
  packages/
    db/
    domain/
    rules/
    imports/
    ui/
    test-fixtures/
  migrations/
  docs/
    architecture/
    governance/
    rules/
    runbooks/
  scripts/
  .github/
    workflows/
    pull_request_template.md
    CODEOWNERS
  README.md
  BUILD_STATUS.md
  PHASE_REGISTER.json
  V1_SCOPE_FREEZE.md
  DECISION_LOG.md
  MANIFEST.txt
```

## Package boundaries
- `db`: schema/query layer only
- `domain`: canonical types and invariants
- `imports`: parsing/mapping/validation
- `rules`: deterministic rule contracts and runners
- `ui`: reusable UI components
- `test-fixtures`: synthetic/golden datasets only

Keep rule logic independent from presentation and payment/billing code.
