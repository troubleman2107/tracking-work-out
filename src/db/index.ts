import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Creates a Neon HTTP client using the DATABASE_URL environment variable.
 * The connection is lazy — no persistent pool is kept open, which is ideal
 * for serverless Vercel functions (no cold-start socket issues).
 */
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

function createDb(): DrizzleDb {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Lazy proxy: throws only when a query is actually executed.
    return new Proxy({} as DrizzleDb, {
      get(_target, prop) {
        if (prop === "then") return undefined; // not a Promise
        return new Proxy({}, {
          get(_t, _p) {
            return () => {
              throw new Error(
                "DATABASE_URL is not set. Add it to your .env.local file or Vercel environment variables."
              );
            };
          },
        });
      },
    });
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

// Use a module-level singleton to avoid creating multiple connections
// during hot-reload in development.
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export type Db = typeof db;

