import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Admin / staff accounts for the backoffice. */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default("Amates Admin"),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/** Unified intake table: web form + WhatsApp webhook both land here. */
export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    contactName: text("contact_name").notNull().default("Unknown"),
    contactEmail: text("contact_email"),
    contactWhatsapp: text("contact_whatsapp").notNull(),
    propertyType: text("property_type").notNull().default("residential"),
    location: text("location").notNull().default("Puerto Princesa"),
    energyUsageKwh: numeric("energy_usage_kwh", { precision: 10, scale: 2 }),
    monthlyBillPhp: numeric("monthly_bill_php", { precision: 12, scale: 2 }),
    gridState: text("grid_state").notNull().default("unstable"),
    timeline: text("timeline").notNull().default("exploring"),
    notes: text("notes"),
    sourceChannel: text("source_channel").notNull().default("web_form"),
    status: text("status").notNull().default("new"),
    leadScore: integer("lead_score").notNull().default(0),
    leadTier: text("lead_tier").notNull().default("cool"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_status_idx").on(table.status),
    index("leads_channel_idx").on(table.sourceChannel),
  ],
);

/** AI-generated proposals + ROI math, one lead can have many revisions. */
export const proposals = pgTable(
  "proposals",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    model: text("model").notNull().default("offline-engine"),
    engine: text("engine").notNull().default("deterministic"),
    systemSizeKw: numeric("system_size_kw", { precision: 8, scale: 2 }),
    batteryKwh: numeric("battery_kwh", { precision: 8, scale: 2 }),
    estimatedCostPhp: numeric("estimated_cost_php", { precision: 14, scale: 2 }),
    monthlySavingsPhp: numeric("monthly_savings_php", { precision: 14, scale: 2 }),
    paybackYears: numeric("payback_years", { precision: 6, scale: 2 }),
    summary: text("summary").notNull().default(""),
    content: text("content").notNull().default(""),
    roi: jsonb("roi"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("proposals_lead_idx").on(table.leadId)],
);

/**
 * Conversation log: every inbound customer message, and every reply we sent or
 * could not send.
 *
 * This is what gives the agent memory. Without it each WhatsApp message created
 * a brand-new lead, so a guest who sent three messages became three unrelated
 * leads and the agent had no history to answer from.
 */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    /** "inbound" = from the customer, "outbound" = from us (agent or staff). */
    direction: text("direction").notNull(),
    channel: text("channel").notNull().default("whatsapp"),
    body: text("body").notNull().default(""),
    /** What actually happened: received | sent | skipped | error. Never aspirational. */
    deliveryStatus: text("delivery_status").notNull().default("received"),
    /** WhatsApp WAMID. Unique so a Meta webhook retry cannot double-log a message. */
    externalId: text("external_id"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_lead_idx").on(table.leadId),
    uniqueIndex("messages_external_unique").on(table.externalId),
  ],
);

/** Booking calendar: site audits then crew dispatch. */
export const appointments = pgTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("audit"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(90),
    crew: text("crew").notNull().default("Unassigned"),
    location: text("location").notNull().default("Palawan"),
    status: text("status").notNull().default("scheduled"),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("appointments_date_idx").on(table.scheduledFor)],
);

/** Commissioned systems; drives the simulated 24/7 monitoring cards. */
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  siteName: text("site_name").notNull(),
  location: text("location").notNull().default("Palawan"),
  propertyType: text("property_type").notNull().default("residential"),
  capacityKw: numeric("capacity_kw", { precision: 8, scale: 2 }).notNull().default("5.00"),
  batteryKwh: numeric("battery_kwh", { precision: 8, scale: 2 }).notNull().default("10.00"),
  status: text("status").notNull().default("online"),
  wifiConnected: boolean("wifi_connected").notNull().default(true),
  monitoringEnabled: boolean("monitoring_enabled").notNull().default(true),
  uptimePct: numeric("uptime_pct", { precision: 5, scale: 2 }).notNull().default("99.50"),
  lastPingAt: timestamp("last_ping_at", { withTimezone: true }).notNull().defaultNow(),
  commissionedAt: timestamp("commissioned_at", { withTimezone: true }).notNull().defaultNow(),
  warrantyYears: integer("warranty_years").notNull().default(25),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Key/value app settings (OpenRouter model selectors, cached model list, etc). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Owner-configurable automation switches. */
export const automationRules = pgTable("automation_rules", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Append-only audit trail of every automated action the system took. */
export const automationLog = pgTable(
  "automation_log",
  {
    id: serial("id").primaryKey(),
    rule: text("rule").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull().default("lead"),
    targetId: integer("target_id"),
    status: text("status").notNull().default("ok"),
    message: text("message").notNull().default(""),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("automation_log_created_idx").on(table.createdAt)],
);

/** Uploaded or referenced media. Binary lives in Postgres so it survives rebuilds. */
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  alt: text("alt").notNull().default(""),
  mime: text("mime").notNull().default("image/jpeg"),
  size: integer("size").notNull().default(0),
  /** Remote source (e.g. stock photo URL). When set, `data` is null. */
  url: text("url"),
  /** Original bytes for uploads as base64, served through /api/media/[id]. */
  data: text("data"),
  folder: text("folder").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Header + footer navigation entries. */
export const navItems = pgTable("nav_items", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  location: text("location").notNull().default("header"),
  group: text("group").notNull().default("main"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Social media links rendered with Lucide icons. */
export const socialLinks = pgTable("social_links", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  icon: text("icon").notNull().default("Globe"),
  location: text("location").notNull().default("header"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Blog posts — full CRUD from the backoffice. */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    content: text("content").notNull().default(""),
    coverMediaId: integer("cover_media_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    category: text("category").notNull().default("Insights"),
    tags: jsonb("tags").notNull().default([]),
    author: text("author").notNull().default("Amates Solutions"),
    status: text("status").notNull().default("draft"),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    featured: boolean("featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("blog_posts_slug_unique").on(table.slug)],
);

/**
 * "David's Notes" — the shared workspace for the owner and his business
 * partners. One note carries the written update plus any number of reference
 * links and images uploaded straight from a device. Partners reply underneath.
 *
 * Deliberately not a blog post: blog posts are public marketing copy with a
 * publish workflow, whereas these are internal working notes visible only
 * behind the backoffice login.
 */
export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    /** Any number of reference links, stored as a plain URL array. */
    urls: jsonb("urls").notNull().default([]),
    /** `media_assets.id` values, in the order the owner attached them. */
    mediaIds: jsonb("media_ids").notNull().default([]),
    author: text("author").notNull().default("David"),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notes_created_idx").on(table.createdAt)],
);

/** Replies on a note. Anyone signed into the backoffice can comment. */
export const noteComments = pgTable(
  "note_comments",
  {
    id: serial("id").primaryKey(),
    noteId: integer("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    author: text("author").notNull().default("Partner"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("note_comments_note_idx").on(table.noteId)],
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type NoteComment = typeof noteComments.$inferSelect;
export type NavItem = typeof navItems.$inferSelect;
export type SocialLink = typeof socialLinks.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;

export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type SystemRow = typeof systems.$inferSelect;
export type Setting = typeof settings.$inferSelect;
