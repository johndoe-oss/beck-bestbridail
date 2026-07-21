import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function ensureConnection() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(_pool, { schema });
  }
  return { pool: _pool!, db: _db! };
}

/** Lazy-initialised connection pool — connect on first use, not at import time. */
export function getPool(): pg.Pool {
  return ensureConnection().pool;
}

/** Lazy-initialised drizzle ORM instance. */
export function getDb() {
  return ensureConnection().db;
}

// Backwards-compatible re-exports for code that imports `pool` / `db` directly.
// These still lazy-init so startup isn't blocked on a DB connection.
export const pool = new Proxy({} as pg.Pool, {
  get(_, prop) {
    return Reflect.get(getPool(), prop, getPool());
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return Reflect.get(getDb(), prop, getDb());
  },
});

export * from "./schema";
