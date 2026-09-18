# Architecture

## Approved infrastructure
- Cloudflare Workers: API and server-side application logic.
- Cloudflare Pages/Workers assets: web front end.
- Cloudflare R2: controlled temporary/import file storage where needed.
- Neon Postgres: persistent application data.
- GitHub: private source repository, protected main and Actions CI.

## Boundary
No Vercel dependency is required or permitted in the core blueprint.

## Services
### Web application
Responsive browser application for customer users.

### API Worker
Handles authentication/session checks, imports, mappings, findings, actions, recovery and reports.

### Import processor
Parses supported CSV/XLSX files, validates data and commits canonical records.

### Rule runner
Executes deterministic, versioned rules scoped to one tenant.

### Database
Tenant-scoped canonical records, findings, actions and audit history.

### R2
Raw uploaded file retention should be minimised. Store only when necessary and apply defined retention/deletion rules.

## Security rules
- Every application query that touches customer data must be tenant scoped.
- Never trust tenant ID supplied only by the client.
- Never log raw sensitive rows unnecessarily.
- Secrets only in approved environment/secret stores.
- All mutations record actor and timestamp.
- Exports require explicit permission.

## Availability philosophy
A detection failure must not corrupt imported data. A failed rule run remains retryable and records failure state.
