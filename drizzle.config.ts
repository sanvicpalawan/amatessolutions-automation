import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load the same file Next.js loads, before reading the URL below.
// dotenv does not overwrite variables that are already set in the environment,
// so CI or a shell export still wins.
config({ path: ".env.local" });

// Neon exposes two connection strings for the same database. Migrations must use
// the DIRECT (unpooled) one: the pooled hostname goes through PgBouncer in
// transaction mode, which cannot hold the session state that DDL needs.
// https://neon.com/docs/connect/choose-connection
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is required to run drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
