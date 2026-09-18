# API Contract — V1 Outline

All customer routes require authenticated, authorised tenant context.

## Imports
- `POST /api/imports` — create upload/import job
- `GET /api/imports/:id` — import summary
- `POST /api/imports/:id/mapping` — save mapping
- `POST /api/imports/:id/validate` — validate rows
- `POST /api/imports/:id/commit` — commit valid rows

## Rules
- `GET /api/rules` — enabled/available rules
- `POST /api/rule-runs` — run rules for eligible data scope
- `GET /api/rule-runs/:id` — run outcome

## Findings
- `GET /api/findings` — filtered findings
- `GET /api/findings/:id` — finding + evidence + history
- `POST /api/findings/:id/hold` — place on HOLD with reason
- `POST /api/findings/:id/dismiss` — dismiss with required reason

## Actions
- `POST /api/findings/:id/actions` — create/update next action
- `POST /api/actions/:id/assign` — assign authorised user
- `POST /api/actions/:id/status` — transition status

## Recovery
- `POST /api/findings/:id/recoveries` — record confirmed recovery event
- `GET /api/findings/:id/recoveries` — recovery history

## Dashboard
- `GET /api/dashboard/summary`
- `GET /api/dashboard/trends`
- `GET /api/dashboard/rules`

## Exports
- `POST /api/exports/findings`
- `POST /api/exports/actions`
- `POST /api/exports/recovery`
- `POST /api/exports/audit`

## Administration
- `GET /api/memberships`
- `POST /api/memberships`
- `PATCH /api/memberships/:id`
- `GET /api/audit-events`

## API rules
- Server validates tenant and role on every route.
- Mutation endpoints are idempotent where retry could duplicate financial/action records.
- Error response includes stable error code and request reference.
- Never expose internal stack traces to customer clients.
