import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createPool(): Pool {
  // Neon pooled connection string (`-pooler` host). PgBouncer handles server-side
  // pooling, so the client pool stays small and is never closed by us.
  const pool = new Pool({ connectionString: databaseUrl });

  // Vercel Fluid compute keeps instances warm, so a TCP pool can safely outlive a
  // single request. This lets the platform drain idle connections before the
  // function suspends. It is a no-op off Vercel (no VERCEL_URL / VERCEL_REGION).
  // https://neon.com/docs/guides/vercel-connection-methods
  attachDatabasePool(pool);

  return pool;
}

export const pool = globalForDb.__arenaNextJsPostgresqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
