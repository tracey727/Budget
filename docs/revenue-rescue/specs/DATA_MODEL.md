# V1 Data Model

## tenants
- id UUID PK
- name text
- status enum(active,suspended,closed)
- timezone text
- created_at timestamptz

## users
- id UUID PK
- auth_subject text unique
- email text
- display_name text
- created_at timestamptz

## memberships
- tenant_id UUID
- user_id UUID
- role enum(owner,admin,manager,reviewer,auditor)
- status enum(active,disabled)
- unique(tenant_id,user_id)

## import_jobs
- id UUID PK
- tenant_id UUID
- source_type text
- original_filename text
- file_sha256 text
- status enum(uploaded,mapping,validating,ready,committed,failed)
- total_rows integer
- valid_rows integer
- invalid_rows integer
- hold_rows integer
- created_by UUID
- created_at timestamptz
- committed_at timestamptz nullable

## import_mappings
- id UUID PK
- tenant_id UUID
- source_type text
- version integer
- mapping_json jsonb
- created_by UUID
- created_at timestamptz

## import_rows
- id UUID PK
- import_job_id UUID
- tenant_id UUID
- row_number integer
- raw_json jsonb
- normalised_json jsonb nullable
- validation_status enum(valid,invalid,hold)
- validation_errors jsonb

## customers_or_clients
- id UUID PK
- tenant_id UUID
- external_ref text nullable
- display_ref text nullable
- minimal_identity_json jsonb

## practitioners_or_workers
- id UUID PK
- tenant_id UUID
- external_ref text nullable
- display_name text nullable

## appointments
- id UUID PK
- tenant_id UUID
- external_ref text
- client_id UUID nullable
- worker_id UUID nullable
- scheduled_start timestamptz
- scheduled_end timestamptz nullable
- status text
- service_value numeric(14,2) nullable
- cancellation_at timestamptz nullable
- source_import_job_id UUID

## invoices
- id UUID PK
- tenant_id UUID
- external_ref text
- client_id UUID nullable
- issue_date date
- due_date date nullable
- total numeric(14,2)
- balance numeric(14,2)
- status text
- source_import_job_id UUID

## payments
- id UUID PK
- tenant_id UUID
- external_ref text nullable
- payment_date date
- amount numeric(14,2)
- invoice_id UUID nullable
- match_status enum(matched,unmatched,hold)
- source_import_job_id UUID

## referrals
- id UUID PK
- tenant_id UUID
- external_ref text nullable
- received_at timestamptz
- status text
- progressed_at timestamptz nullable
- source_import_job_id UUID

## waitlist_entries
- id UUID PK
- tenant_id UUID
- external_ref text nullable
- client_id UUID nullable
- status text
- availability_json jsonb
- created_at_source timestamptz nullable
- source_import_job_id UUID

## operational_tasks
- id UUID PK
- tenant_id UUID
- external_ref text nullable
- task_type text
- due_at timestamptz nullable
- status text
- related_value numeric(14,2) nullable
- source_import_job_id UUID

## rule_definitions
- rule_id text
- name text
- domain text
- enabled_by_default boolean

## rule_versions
- rule_id text
- version integer
- logic_hash text
- contract_json jsonb
- active boolean

## findings
- id UUID PK
- tenant_id UUID
- rule_id text
- rule_version integer
- finding_key text
- title text
- explanation text
- status enum(new,reviewing,actioned,resolved,hold,dismissed)
- confidence enum(high,medium,low,hold)
- estimated_value numeric(14,2) nullable
- priority_score integer nullable
- priority_band enum(red,amber,green,hold)
- first_detected_at timestamptz
- last_detected_at timestamptz
- resolved_at timestamptz nullable
- unique(tenant_id,finding_key)

## finding_evidence
- id UUID PK
- tenant_id UUID
- finding_id UUID
- source_entity_type text
- source_entity_id UUID
- evidence_json jsonb
- created_at timestamptz

## actions
- id UUID PK
- tenant_id UUID
- finding_id UUID
- assigned_to UUID nullable
- next_action text nullable
- due_at timestamptz nullable
- status text
- created_by UUID
- created_at timestamptz
- updated_at timestamptz

## recovery_events
- id UUID PK
- tenant_id UUID
- finding_id UUID
- amount numeric(14,2)
- recovery_date date
- evidence_note text
- confirmed_by UUID
- created_at timestamptz

## dismissals
- id UUID PK
- tenant_id UUID
- finding_id UUID
- reason_code text
- reason_note text
- dismissed_by UUID
- created_at timestamptz

## audit_events
- id UUID PK
- tenant_id UUID
- actor_user_id UUID nullable
- event_type text
- entity_type text
- entity_id UUID nullable
- request_id text nullable
- metadata_json jsonb
- created_at timestamptz

## Key invariants
- Currency values use fixed numeric precision, never floating point.
- All customer-domain tables include tenant_id.
- Estimated values and confirmed recovery values are separate.
- HOLD findings cannot contribute to claimed confirmed savings.
- A recovery event is immutable after posting; corrections use reversal/adjustment events, not silent edits.
