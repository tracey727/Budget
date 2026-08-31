CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"destination" text,
	"starts_on" date,
	"ends_on" date,
	"budget_amount" numeric(14, 2),
	"planned_km" integer,
	"notes" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "trip_id" uuid;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trips_user_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trips_dates_idx" ON "trips" USING btree ("user_id","starts_on");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_trip_idx" ON "transactions" USING btree ("trip_id");