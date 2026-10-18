CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer,
	"title" text NOT NULL,
	"kind" text DEFAULT 'audit' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 90 NOT NULL,
	"crew" text DEFAULT 'Unassigned' NOT NULL,
	"location" text DEFAULT 'Palawan' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"dispatched_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text DEFAULT 'lead' NOT NULL,
	"target_id" integer,
	"status" text DEFAULT 'ok' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"cover_media_id" integer,
	"category" text DEFAULT 'Insights' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author" text DEFAULT 'Amates Solutions' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_name" text DEFAULT 'Unknown' NOT NULL,
	"contact_email" text,
	"contact_whatsapp" text NOT NULL,
	"property_type" text DEFAULT 'residential' NOT NULL,
	"location" text DEFAULT 'Puerto Princesa' NOT NULL,
	"energy_usage_kwh" numeric(10, 2),
	"monthly_bill_php" numeric(12, 2),
	"grid_state" text DEFAULT 'unstable' NOT NULL,
	"timeline" text DEFAULT 'exploring' NOT NULL,
	"notes" text,
	"source_channel" text DEFAULT 'web_form' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"lead_score" integer DEFAULT 0 NOT NULL,
	"lead_tier" text DEFAULT 'cool' NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"url" text,
	"data" text,
	"folder" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nav_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"location" text DEFAULT 'header' NOT NULL,
	"group" text DEFAULT 'main' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"model" text DEFAULT 'offline-engine' NOT NULL,
	"engine" text DEFAULT 'deterministic' NOT NULL,
	"system_size_kw" numeric(8, 2),
	"battery_kwh" numeric(8, 2),
	"estimated_cost_php" numeric(14, 2),
	"monthly_savings_php" numeric(14, 2),
	"payback_years" numeric(6, 2),
	"summary" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"roi" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"icon" text DEFAULT 'Globe' NOT NULL,
	"location" text DEFAULT 'header' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer,
	"site_name" text NOT NULL,
	"location" text DEFAULT 'Palawan' NOT NULL,
	"property_type" text DEFAULT 'residential' NOT NULL,
	"capacity_kw" numeric(8, 2) DEFAULT '5.00' NOT NULL,
	"battery_kwh" numeric(8, 2) DEFAULT '10.00' NOT NULL,
	"status" text DEFAULT 'online' NOT NULL,
	"wifi_connected" boolean DEFAULT true NOT NULL,
	"monitoring_enabled" boolean DEFAULT true NOT NULL,
	"uptime_pct" numeric(5, 2) DEFAULT '99.50' NOT NULL,
	"last_ping_at" timestamp with time zone DEFAULT now() NOT NULL,
	"commissioned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"warranty_years" integer DEFAULT 25 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT 'Amates Admin' NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_cover_media_id_media_assets_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_date_idx" ON "appointments" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "automation_log_created_idx" ON "automation_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_unique" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_channel_idx" ON "leads" USING btree ("source_channel");--> statement-breakpoint
CREATE INDEX "proposals_lead_idx" ON "proposals" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");