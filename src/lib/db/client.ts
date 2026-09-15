import "server-only";

import postgres from "postgres";

/**
 * Postgres access for synced per-user state (users themselves live in Clerk). One pooled client per server
 * process; `null` when DATABASE_URL is absent so the app keeps working local-only.
 */

let client: postgres.Sql | null | undefined;
let schemaReady: Promise<void> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): postgres.Sql | null {
  if (client !== undefined) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    client = null;
    return client;
  }
  const hasSslMode = /sslmode=/.test(url);
  client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX) > 0 ? Number(process.env.DATABASE_POOL_MAX) : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ...(hasSslMode ? {} : { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "prefer" as const }),
  });
  return client;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_state (
  user_id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

/** Idempotent schema bootstrap; runs once per process on first use. */
export async function ensureSchema(sql: postgres.Sql) {
  if (!schemaReady) {
    schemaReady = sql.unsafe(SCHEMA).then(() => undefined).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/** Returns a ready client or throws a typed error when storage is unavailable. */
export async function requireDb() {
  const sql = getSql();
  if (!sql) throw new StorageUnavailableError();
  await ensureSchema(sql);
  return sql;
}

export class StorageUnavailableError extends Error {
  constructor() {
    super("Saved data is not enabled on this deployment. Set DATABASE_URL.");
    this.name = "StorageUnavailableError";
  }
}
