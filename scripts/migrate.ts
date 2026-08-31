/**
 * Applies pending Drizzle migrations to the Neon database in DATABASE_URL.
 *
 * Run this once against production before the first deploy, and again after
 * any schema change:  DATABASE_URL="postgres://..." npm run db:migrate
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set.\n" +
        'Usage: DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" npm run db:migrate',
    );
    process.exit(1);
  }

  console.log("Connecting to Neon…");
  const db = drizzle(neon(url));

  console.log("Applying migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("✓ Database is up to date.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
