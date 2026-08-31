# Setup files

## `database-setup.sql`

Every migration in `drizzle/` concatenated into one file, so a new database can
be created by pasting it into Neon's SQL Editor rather than running tooling.

Use it once, on an empty database. After that, schema changes go through
`npm run db:generate` and `npm run db:migrate` as normal.

Regenerate it after adding a migration:

```bash
{
  echo "-- Genevieve App — Budget App"
  echo "-- Complete database setup."
  echo "--"
  echo "-- Paste this whole file into the Neon SQL Editor and press Run."
  echo "-- It creates every table the app needs. Safe to run once on a new database."
  echo "-- Generated from drizzle/*.sql — do not edit by hand."
  echo ""
  for f in drizzle/*.sql; do
    echo "-- ===== $(basename "$f") ====="
    sed 's/--> statement-breakpoint//' "$f"
    echo ""
  done
} > setup/database-setup.sql
```
