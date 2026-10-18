/**
 * Neon Postgres access layer.
 *
 * The app talks to Neon (or any Postgres-compatible endpoint) through a single
 * pooled Drizzle client. The connection string lives in `.env` as
 * `DATABASE_URL` and is NEVER exposed to the browser bundle.
 *
 * Every query in the app goes through Drizzle's query builder, which emits
 * parameterized SQL ($1, $2, ...) — no string concatenation, no injection.
 */
import "server-only";

import { db, pool } from "@/db";
import * as schema from "@/db/schema";

export { db, pool, schema };

export const neon = db;

/** Masks a connection string for safe display in the admin UI. */
export function describeDatabase(): { host: string; configured: boolean; driver: string } {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return { host: "not configured", configured: false, driver: "neon-postgres" };
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host,
      configured: true,
      driver: parsed.host.includes("neon.tech") ? "neon-serverless" : "postgres",
    };
  } catch {
    return { host: "invalid url", configured: false, driver: "postgres" };
  }
}
