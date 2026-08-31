import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { missingEnv, stripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Deployment health check. Reports configuration and database reachability
 * without leaking secret values — useful straight after a Cloudflare deploy.
 */
export async function GET() {
  const missing = missingEnv();

  let database: "ok" | "unreachable" | "unconfigured" = "unconfigured";
  if (!missing.includes("DATABASE_URL")) {
    try {
      await db().execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "unreachable";
    }
  }

  const healthy = missing.length === 0 && database === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      stripe: stripeConfigured() ? "configured" : "not configured",
      missingEnv: missing,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
