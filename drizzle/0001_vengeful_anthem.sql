CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"direction" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"delivery_status" text DEFAULT 'received' NOT NULL,
	"external_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_lead_idx" ON "messages" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_external_unique" ON "messages" USING btree ("external_id");