import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

function createDb(connectionString: string) {
  // The Neon HTTP driver speaks plain `fetch`, so it works inside Cloudflare
  // Workers where raw TCP sockets are unavailable. Each query is a single
  // round trip — no pool to keep warm across isolates.
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

// Cached per isolate. `requireEnv` runs lazily on first use (inside a request),
// which is required on Workers because bindings are not present at module load.
let cached: { url: string; db: Database } | null = null;

export function db(): Database {
  const url = requireEnv("DATABASE_URL");
  if (!cached || cached.url !== url) {
    cached = { url, db: createDb(url) };
  }
  return cached.db;
}

export { schema };
