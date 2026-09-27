-- Genevieve App — Budget App
-- Complete database setup.
--
-- Paste this whole file into the Neon SQL Editor and press Run.
-- It creates every table the app needs. Safe to run once on a new database.
-- Generated from drizzle/*.sql — do not edit by hand.

-- ===== 0000_same_nighthawk.sql =====
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'transaction' NOT NULL,
	"institution" text,
	"bsb_last3" text,
	"account_last4" text,
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'AUD' NOT NULL,
	"is_business" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL,
	"rollover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'expense' NOT NULL,
	"bucket" text DEFAULT 'lifestyle' NOT NULL,
	"colour" text DEFAULT '#10b981' NOT NULL,
	"icon" text,
	"is_deductible" boolean DEFAULT false NOT NULL,
	"gst_applicable" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);

CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(14, 2) NOT NULL,
	"saved_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"target_date" date,
	"account_id" uuid,
	"kind" text DEFAULT 'other' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "recurring_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"category_id" uuid,
	"account_id" uuid,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"next_due_on" date NOT NULL,
	"auto_pay" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"price_id" text NOT NULL,
	"product_id" text,
	"plan_key" text NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"description" text NOT NULL,
	"merchant" text,
	"occurred_on" date NOT NULL,
	"notes" text,
	"gst_amount" numeric(14, 2),
	"is_business" boolean DEFAULT false NOT NULL,
	"is_reconciled" boolean DEFAULT false NOT NULL,
	"import_batch_id" uuid,
	"dedupe_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"state" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"plan_status" text DEFAULT 'none' NOT NULL,
	"plan_renews_at" timestamp with time zone,
	"stripe_customer_id" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "recurring_bills" ADD CONSTRAINT "recurring_bills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");
CREATE UNIQUE INDEX "budgets_unique_period" ON "budgets" USING btree ("user_id","category_id","period_start");
CREATE INDEX "budgets_user_period_idx" ON "budgets" USING btree ("user_id","period_start");
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");
CREATE UNIQUE INDEX "categories_user_name_unique" ON "categories" USING btree ("user_id","name");
CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id");
CREATE INDEX "recurring_bills_user_due_idx" ON "recurring_bills" USING btree ("user_id","next_due_on");
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","occurred_on");
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category_id");
CREATE INDEX "transactions_batch_idx" ON "transactions" USING btree ("import_batch_id");
CREATE UNIQUE INDEX "transactions_dedupe_unique" ON "transactions" USING btree ("user_id","dedupe_hash");
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");
CREATE INDEX "users_stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");
-- ===== 0001_melodic_captain_midlands.sql =====
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "password_reset_user_idx" ON "password_reset_tokens" USING btree ("user_id");
-- ===== 0002_redundant_unicorn.sql =====
CREATE TABLE "email_verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "email_verification_user_idx" ON "email_verification_tokens" USING btree ("user_id");
-- ===== 0003_white_swordsman.sql =====
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"amount" numeric(14, 2),
	"dedupe_key" text NOT NULL,
	"read_at" timestamp with time zone,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bank_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_connection_id" text NOT NULL,
	"provider_user_id" text,
	"institution_id" text,
	"institution_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"consent_expires_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"backfilled_from" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "bank_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"accounts_synced" integer DEFAULT 0 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"cleared" integer DEFAULT 0 NOT NULL,
	"dropped" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);

CREATE TABLE "bank_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pattern" text NOT NULL,
	"match_type" text DEFAULT 'contains' NOT NULL,
	"category_id" uuid NOT NULL,
	"rename_to" text,
	"mark_business" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"times_applied" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "accounts" ADD COLUMN "connection_id" uuid;
ALTER TABLE "accounts" ADD COLUMN "provider_account_id" text;
ALTER TABLE "accounts" ADD COLUMN "ledger_balance" numeric(14, 2);
ALTER TABLE "accounts" ADD COLUMN "available_balance" numeric(14, 2);
ALTER TABLE "accounts" ADD COLUMN "balance_updated_at" timestamp with time zone;
ALTER TABLE "accounts" ADD COLUMN "sync_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "status" text DEFAULT 'posted' NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "cleared_at" timestamp with time zone;
ALTER TABLE "transactions" ADD COLUMN "pending_since" timestamp with time zone;
ALTER TABLE "transactions" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;
ALTER TABLE "transactions" ADD COLUMN "connection_id" uuid;
ALTER TABLE "transactions" ADD COLUMN "provider_transaction_id" text;
ALTER TABLE "transactions" ADD COLUMN "settled_pending_id" text;
ALTER TABLE "transactions" ADD COLUMN "provider_payload" jsonb;
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bank_sync_runs" ADD CONSTRAINT "bank_sync_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bank_sync_runs" ADD CONSTRAINT "bank_sync_runs_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "alerts_user_created_idx" ON "alerts" USING btree ("user_id","created_at");
CREATE UNIQUE INDEX "alerts_dedupe_unique" ON "alerts" USING btree ("user_id","dedupe_key");
CREATE INDEX "bank_connections_user_idx" ON "bank_connections" USING btree ("user_id");
CREATE UNIQUE INDEX "bank_connections_provider_unique" ON "bank_connections" USING btree ("provider","provider_connection_id");
CREATE INDEX "bank_sync_runs_user_idx" ON "bank_sync_runs" USING btree ("user_id","started_at");
CREATE INDEX "category_rules_user_idx" ON "category_rules" USING btree ("user_id","priority");
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "accounts_connection_idx" ON "accounts" USING btree ("connection_id");
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("connection_id","provider_account_id");
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("user_id","status");
CREATE UNIQUE INDEX "transactions_provider_unique" ON "transactions" USING btree ("user_id","provider_transaction_id");
-- Rows that already existed were all settled by definition: they were either
-- typed in by hand or read off a statement the bank had already produced.
UPDATE "transactions" SET "source" = 'import' WHERE "import_batch_id" IS NOT NULL;
UPDATE "transactions" SET "cleared_at" = "created_at" WHERE "cleared_at" IS NULL AND "status" = 'posted';

-- ===== 0004_quiet_queen_noir.sql =====
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

CREATE TABLE "rr_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"display_ref" text,
	"minimal_identity_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "rr_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"reason_code" text NOT NULL,
	"reason_note" text NOT NULL,
	"dismissed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE "rr_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'reviewer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE "rr_workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_actions" ADD CONSTRAINT "rr_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_appointments" ADD CONSTRAINT "rr_appointments_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_appointments" ADD CONSTRAINT "rr_appointments_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_audit_events" ADD CONSTRAINT "rr_audit_events_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_audit_events" ADD CONSTRAINT "rr_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_clients" ADD CONSTRAINT "rr_clients_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_dismissals" ADD CONSTRAINT "rr_dismissals_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_dismissals" ADD CONSTRAINT "rr_dismissals_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_dismissals" ADD CONSTRAINT "rr_dismissals_dismissed_by_users_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_finding_evidence" ADD CONSTRAINT "rr_finding_evidence_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_finding_evidence" ADD CONSTRAINT "rr_finding_evidence_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_findings" ADD CONSTRAINT "rr_findings_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_import_jobs" ADD CONSTRAINT "rr_import_jobs_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_import_jobs" ADD CONSTRAINT "rr_import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_import_mappings" ADD CONSTRAINT "rr_import_mappings_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_import_mappings" ADD CONSTRAINT "rr_import_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_import_rows" ADD CONSTRAINT "rr_import_rows_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_import_rows" ADD CONSTRAINT "rr_import_rows_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_invoices" ADD CONSTRAINT "rr_invoices_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_invoices" ADD CONSTRAINT "rr_invoices_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_memberships" ADD CONSTRAINT "rr_memberships_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_memberships" ADD CONSTRAINT "rr_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_payments" ADD CONSTRAINT "rr_payments_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_payments" ADD CONSTRAINT "rr_payments_invoice_id_rr_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."rr_invoices"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_payments" ADD CONSTRAINT "rr_payments_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_recovery_events" ADD CONSTRAINT "rr_recovery_events_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_recovery_events" ADD CONSTRAINT "rr_recovery_events_finding_id_rr_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."rr_findings"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_recovery_events" ADD CONSTRAINT "rr_recovery_events_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_referrals" ADD CONSTRAINT "rr_referrals_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_referrals" ADD CONSTRAINT "rr_referrals_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_rule_runs" ADD CONSTRAINT "rr_rule_runs_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_rule_runs" ADD CONSTRAINT "rr_rule_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_operational_tasks" ADD CONSTRAINT "rr_operational_tasks_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_operational_tasks" ADD CONSTRAINT "rr_operational_tasks_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_waitlist_entries" ADD CONSTRAINT "rr_waitlist_entries_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rr_waitlist_entries" ADD CONSTRAINT "rr_waitlist_entries_source_import_job_id_rr_import_jobs_id_fk" FOREIGN KEY ("source_import_job_id") REFERENCES "public"."rr_import_jobs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "rr_workers" ADD CONSTRAINT "rr_workers_tenant_id_rr_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."rr_tenants"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "rr_actions_tenant_idx" ON "rr_actions" USING btree ("tenant_id","status");
CREATE INDEX "rr_actions_finding_idx" ON "rr_actions" USING btree ("finding_id");
CREATE INDEX "rr_actions_assignee_idx" ON "rr_actions" USING btree ("tenant_id","assigned_to");
CREATE UNIQUE INDEX "rr_appointments_tenant_ref_unique" ON "rr_appointments" USING btree ("tenant_id","external_ref");
CREATE INDEX "rr_appointments_tenant_start_idx" ON "rr_appointments" USING btree ("tenant_id","scheduled_start");
CREATE INDEX "rr_audit_tenant_idx" ON "rr_audit_events" USING btree ("tenant_id","created_at");
CREATE INDEX "rr_audit_entity_idx" ON "rr_audit_events" USING btree ("tenant_id","entity_type","entity_id");
CREATE UNIQUE INDEX "rr_clients_tenant_ref_unique" ON "rr_clients" USING btree ("tenant_id","external_ref");
CREATE INDEX "rr_dismissals_finding_idx" ON "rr_dismissals" USING btree ("finding_id");
CREATE INDEX "rr_finding_evidence_finding_idx" ON "rr_finding_evidence" USING btree ("finding_id");
CREATE UNIQUE INDEX "rr_findings_tenant_key_unique" ON "rr_findings" USING btree ("tenant_id","finding_key");
CREATE INDEX "rr_findings_tenant_status_idx" ON "rr_findings" USING btree ("tenant_id","status");
CREATE INDEX "rr_findings_tenant_band_idx" ON "rr_findings" USING btree ("tenant_id","priority_band");
CREATE INDEX "rr_findings_tenant_rule_idx" ON "rr_findings" USING btree ("tenant_id","rule_id");
CREATE INDEX "rr_import_jobs_tenant_idx" ON "rr_import_jobs" USING btree ("tenant_id","created_at");
CREATE INDEX "rr_import_jobs_hash_idx" ON "rr_import_jobs" USING btree ("tenant_id","file_sha256");
CREATE INDEX "rr_import_mappings_tenant_idx" ON "rr_import_mappings" USING btree ("tenant_id","source_type");
CREATE INDEX "rr_import_rows_job_idx" ON "rr_import_rows" USING btree ("import_job_id","row_number");
CREATE INDEX "rr_import_rows_status_idx" ON "rr_import_rows" USING btree ("import_job_id","validation_status");
CREATE UNIQUE INDEX "rr_invoices_tenant_ref_unique" ON "rr_invoices" USING btree ("tenant_id","external_ref");
CREATE INDEX "rr_invoices_tenant_due_idx" ON "rr_invoices" USING btree ("tenant_id","due_date");
CREATE UNIQUE INDEX "rr_memberships_tenant_user_unique" ON "rr_memberships" USING btree ("tenant_id","user_id");
CREATE INDEX "rr_memberships_user_idx" ON "rr_memberships" USING btree ("user_id");
CREATE UNIQUE INDEX "rr_payments_tenant_key_unique" ON "rr_payments" USING btree ("tenant_id","dedupe_key");
CREATE INDEX "rr_payments_tenant_date_idx" ON "rr_payments" USING btree ("tenant_id","payment_date");
CREATE INDEX "rr_recovery_tenant_date_idx" ON "rr_recovery_events" USING btree ("tenant_id","recovery_date");
CREATE INDEX "rr_recovery_finding_idx" ON "rr_recovery_events" USING btree ("finding_id");
CREATE UNIQUE INDEX "rr_referrals_tenant_key_unique" ON "rr_referrals" USING btree ("tenant_id","dedupe_key");
CREATE INDEX "rr_rule_runs_tenant_idx" ON "rr_rule_runs" USING btree ("tenant_id","started_at");
CREATE UNIQUE INDEX "rr_tasks_tenant_key_unique" ON "rr_operational_tasks" USING btree ("tenant_id","dedupe_key");
CREATE UNIQUE INDEX "rr_tenants_slug_unique" ON "rr_tenants" USING btree ("slug");
CREATE UNIQUE INDEX "rr_waitlist_tenant_key_unique" ON "rr_waitlist_entries" USING btree ("tenant_id","dedupe_key");
CREATE UNIQUE INDEX "rr_workers_tenant_ref_unique" ON "rr_workers" USING btree ("tenant_id","external_ref");
-- ===== 0005_charming_red_ghost.sql =====
ALTER TABLE "rr_import_jobs" ADD COLUMN "source_sheet" text;
ALTER TABLE "rr_import_jobs" ADD COLUMN "source_sheet_count" integer;
-- ===== 0006_login_lockout.sql =====
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;
