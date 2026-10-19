CREATE TABLE "solar_package_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"product_id" integer,
	"label" text DEFAULT '' NOT NULL,
	"qty" numeric(10, 2) DEFAULT '1' NOT NULL,
	"basis" text DEFAULT 'each' NOT NULL,
	"unit_cost_minor" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solar_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"size_kwp" numeric(8, 2),
	"kind" text DEFAULT 'fixed' NOT NULL,
	"sell_price_minor" integer DEFAULT 0 NOT NULL,
	"markup_pct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solar_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'accessory' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"specs" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"cost_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"freight_minor" integer DEFAULT 0 NOT NULL,
	"moq" integer DEFAULT 1 NOT NULL,
	"lead_time" text DEFAULT '' NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"warranty" text DEFAULT '' NOT NULL,
	"availability" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solar_package_items" ADD CONSTRAINT "solar_package_items_package_id_solar_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."solar_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solar_package_items" ADD CONSTRAINT "solar_package_items_product_id_solar_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."solar_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solar_package_items_package_idx" ON "solar_package_items" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "solar_products_category_idx" ON "solar_products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "solar_products_brand_idx" ON "solar_products" USING btree ("brand");