CREATE TABLE "fin_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"amount_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"spent_on" date,
	"job_id" integer,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer" text NOT NULL,
	"location" text DEFAULT 'Palawan' NOT NULL,
	"size_kwp" numeric(8, 2),
	"status" text DEFAULT 'quoted' NOT NULL,
	"sell_price_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"cost_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"closed_on" date,
	"lead_id" integer,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_marketing" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"campaign" text DEFAULT '' NOT NULL,
	"planned_minor" integer DEFAULT 0 NOT NULL,
	"actual_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_recurring" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"vendor" text DEFAULT '' NOT NULL,
	"amount_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"cycle" text DEFAULT 'monthly' NOT NULL,
	"plan" text DEFAULT 'paid' NOT NULL,
	"category" text DEFAULT 'hosting' NOT NULL,
	"next_renewal" date,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fin_expenses" ADD CONSTRAINT "fin_expenses_job_id_fin_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."fin_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_jobs" ADD CONSTRAINT "fin_jobs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fin_jobs_closed_idx" ON "fin_jobs" USING btree ("closed_on");--> statement-breakpoint
CREATE INDEX "fin_marketing_period_idx" ON "fin_marketing" USING btree ("period");