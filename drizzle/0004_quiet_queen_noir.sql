CREATE TABLE "rr_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"assigned_to" uuid,
	"next_action" text,
	"due_at" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"client_ref" text,
	"worker_ref" text,
	"scheduled_start" timestamp with time zone NOT NULL,
	"scheduled_end" timestamp with time zone,
	"status" text NOT NULL,
	"service_value" numeric(14, 2),
	"cancellation_at" timestamp with time zone,
	"source_import_job_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"request_id" text,
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"display_ref" text,
	"minimal_identity_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"reason_note" text NOT NULL,
	"dismissed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_finding_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" uuid,
	"label" text NOT NULL,
	"evidence_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"rule_version" integer NOT NULL,
	"rule_logic_hash" text NOT NULL,
	"finding_key" text NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"calculation" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"confidence" text NOT NULL,
	"hold_reason" text,
	"estimated_value" numeric(14, 2),
	"value_basis" text DEFAULT 'none' NOT NULL,
	"priority_score" integer,
	"priority_band" text DEFAULT 'green' NOT NULL,
	"priority_rationale" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"first_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_reason" text
);
--> statement-breakpoint
CREATE TABLE "rr_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_sha256" text NOT NULL,
	"status" text DEFAULT 'mapping' NOT NULL,
	"headers_json" jsonb,
	"mapping_json" jsonb,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"hold_rows" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rr_import_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"mapping_json" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_job_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw_json" jsonb NOT NULL,
	"normalised_json" jsonb,
	"validation_status" text DEFAULT 'valid' NOT NULL,
	"validation_errors" jsonb
);
--> statement-breakpoint
CREATE TABLE "rr_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"client_ref" text,
	"issue_date" date NOT NULL,
	"due_date" date,
	"total" numeric(14, 2) NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"status" text NOT NULL,
	"source_import_job_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'reviewer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text,
	"payment_date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"invoice_ref" text,
	"invoice_id" uuid,
	"match_status" text DEFAULT 'unmatched' NOT NULL,
	"dedupe_key" text NOT NULL,
	"source_import_job_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_recovery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"recovery_date" date NOT NULL,
	"evidence_note" text NOT NULL,
	"reversal_of_id" uuid,
	"confirmed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text,
	"received_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"progressed_at" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	"source_import_job_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_rule_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"rule_ids_json" jsonb,
	"findings_created" integer DEFAULT 0 NOT NULL,
	"findings_updated" integer DEFAULT 0 NOT NULL,
	"findings_resolved" integer DEFAULT 0 NOT NULL,
	"failures_json" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "rr_operational_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text,
	"task_type" text NOT NULL,
	"due_at" timestamp with time zone,
	"status" text NOT NULL,
	"related_value" numeric(14, 2),
	"related_ref" text,
	"dedupe_key" text NOT NULL,
	"source_import_job_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"timezone" text DEFAULT 'Australia/Sydney' NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"settings_json" jsonb,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text,
	"client_ref" text,
	"status" text NOT NULL,
	"availability" text,
	"created_at_source" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	"source_import_job_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rr_workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_appointments" ADD CONSTRAINT "rr_appointments_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_appointments" ADD CONSTRAINT "rr_appointments_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_audit_events" ADD CONSTRAINT "rr_audit_events_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_audit_events" ADD CONSTRAINT "rr_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_clients" ADD CONSTRAINT "rr_clients_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_dismissals" ADD CONSTRAINT "rr_dismissals_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_dismissals" ADD CONSTRAINT "rr_dismissals_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_dismissals" ADD CONSTRAINT "rr_dismissals_dismissed_by_users_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_finding_evidence" ADD CONSTRAINT "rr_finding_evidence_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_finding_evidence" ADD CONSTRAINT "rr_finding_evidence_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_findings" ADD CONSTRAINT "rr_findings_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_import_jobs" ADD CONSTRAINT "rr_import_jobs_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_import_jobs" ADD CONSTRAINT "rr_import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_import_mappings" ADD CONSTRAINT "rr_import_mappings_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_import_mappings" ADD CONSTRAINT "rr_import_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_import_rows" ADD CONSTRAINT "rr_import_rows_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_import_rows" ADD CONSTRAINT "rr_import_rows_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_invoices" ADD CONSTRAINT "rr_invoices_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_invoices" ADD CONSTRAINT "rr_invoices_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_memberships" ADD CONSTRAINT "rr_memberships_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_memberships" ADD CONSTRAINT "rr_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_payments" ADD CONSTRAINT "rr_payments_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_payments" ADD CONSTRAINT "rr_payments_invoice_id_rr_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."rr_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_payments" ADD CONSTRAINT "rr_payments_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_recovery_events" ADD CONSTRAINT "rr_recovery_events_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_recovery_events" ADD CONSTRAINT "rr_recovery_events_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_recovery_events" ADD CONSTRAINT "rr_recovery_events_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_referrals" ADD CONSTRAINT "rr_referrals_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_referrals" ADD CONSTRAINT "rr_referrals_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_rule_runs" ADD CONSTRAINT "rr_rule_runs_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_rule_runs" ADD CONSTRAINT "rr_rule_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_operational_tasks" ADD CONSTRAINT "rr_operational_tasks_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_operational_tasks" ADD CONSTRAINT "rr_operational_tasks_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_waitlist_entries" ADD CONSTRAINT "rr_waitlist_entries_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_waitlist_entries" ADD CONSTRAINT "rr_waitlist_entries_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rr_workers" ADD CONSTRAINT "rr_workers_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rr_actions_tenant_idx" ON "rr_actions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "rr_actions_finding_idx" ON "rr_actions" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "rr_actions_assignee_idx" ON "rr_actions" USING btree ("tenant_id","assigned_to");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_appointments_tenant_ref_unique" ON "rr_appointments" USING btree ("tenant_id","external_ref");--> statement-breakpoint
CREATE INDEX "rr_appointments_tenant_start_idx" ON "rr_appointments" USING btree ("tenant_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "rr_audit_tenant_idx" ON "rr_audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "rr_audit_entity_idx" ON "rr_audit_events" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_clients_tenant_ref_unique" ON "rr_clients" USING btree ("tenant_id","external_ref");--> statement-breakpoint
CREATE INDEX "rr_dismissals_finding_idx" ON "rr_dismissals" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "rr_finding_evidence_finding_idx" ON "rr_finding_evidence" USING btree ("finding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_findings_tenant_key_unique" ON "rr_findings" USING btree ("tenant_id","finding_key");--> statement-breakpoint
CREATE INDEX "rr_findings_tenant_status_idx" ON "rr_findings" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "rr_findings_tenant_band_idx" ON "rr_findings" USING btree ("tenant_id","priority_band");--> statement-breakpoint
CREATE INDEX "rr_findings_tenant_rule_idx" ON "rr_findings" USING btree ("tenant_id","rule_id");--> statement-breakpoint
CREATE INDEX "rr_import_jobs_tenant_idx" ON "rr_import_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "rr_import_jobs_hash_idx" ON "rr_import_jobs" USING btree ("tenant_id","file_sha256");--> statement-breakpoint
CREATE INDEX "rr_import_mappings_tenant_idx" ON "rr_import_mappings" USING btree ("tenant_id","source_type");--> statement-breakpoint
CREATE INDEX "rr_import_rows_job_idx" ON "rr_import_rows" USING btree ("import_job_id","row_number");--> statement-breakpoint
CREATE INDEX "rr_import_rows_status_idx" ON "rr_import_rows" USING btree ("import_job_id","validation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_invoices_tenant_ref_unique" ON "rr_invoices" USING btree ("tenant_id","external_ref");--> statement-breakpoint
CREATE INDEX "rr_invoices_tenant_due_idx" ON "rr_invoices" USING btree ("tenant_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_memberships_tenant_user_unique" ON "rr_memberships" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "rr_memberships_user_idx" ON "rr_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_payments_tenant_key_unique" ON "rr_payments" USING btree ("tenant_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "rr_payments_tenant_date_idx" ON "rr_payments" USING btree ("tenant_id","payment_date");--> statement-breakpoint
CREATE INDEX "rr_recovery_tenant_date_idx" ON "rr_recovery_events" USING btree ("tenant_id","recovery_date");--> statement-breakpoint
CREATE INDEX "rr_recovery_finding_idx" ON "rr_recovery_events" USING btree ("finding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_referrals_tenant_key_unique" ON "rr_referrals" USING btree ("tenant_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "rr_rule_runs_tenant_idx" ON "rr_rule_runs" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_tasks_tenant_key_unique" ON "rr_operational_tasks" USING btree ("tenant_id","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_tenants_slug_unique" ON "rr_tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_waitlist_tenant_key_unique" ON "rr_waitlist_entries" USING btree ("tenant_id","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "rr_workers_tenant_ref_unique" ON "rr_workers" USING btree ("tenant_id","external_ref");