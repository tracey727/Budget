import { NextResponse } from "next/server";
import { cronSecret } from "@/lib/env";
import { connectionsDueForSync, syncConnection } from "@/lib/bank/sync";
import { runBillChecks } from "@/lib/jobs/reminders";
import { sendAlertDigests } from "@/lib/jobs/digest";
import { timingSafeEqual } from "@/lib/bank/signature";

export const dynamic = "force-dynamic";

/**
 * The scheduled refresh.
 *
 * Webhooks cover almost everything, but not a provider that drops a delivery
 * or a bank that settles overnight without telling anyone, so connections are
 * also swept on a timer. Cloudflare Cron Triggers (or any scheduler that can
 * make an HTTPS request) call this with the shared secret:
 *
 *   curl -X POST https://<host>/api/cron/sync \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * Work is capped per invocation so a single run cannot exceed a Worker's CPU
 * budget; whatever is left over is picked up by the next one, oldest first.
 */
const MAX_CONNECTIONS_PER_RUN = 25;

async function handle(request: Request) {
  const secret = cronSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured, so scheduled sync is disabled." },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";

  if (!timingSafeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const due = await connectionsDueForSync(MAX_CONNECTIONS_PER_RUN);

  const results = [];
  for (const connection of due) {
    results.push(await syncConnection(connection, "schedule"));
  }

  // Reminders run after the syncs so a bill that just cleared at the bank is
  // no longer flagged as due.
  const reminders = await runBillChecks();
  const digest = await sendAlertDigests();

  return NextResponse.json(
    {
      ok: true,
      connections: results.length,
      cleared: results.reduce((total, row) => total + row.cleared, 0),
      added: results.reduce((total, row) => total + row.added, 0),
      dropped: results.reduce((total, row) => total + row.dropped, 0),
      failed: results.filter((row) => row.status === "error").length,
      reminders,
      digest,
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  return handle(request);
}

/** GET is accepted too, because some schedulers cannot issue a POST. */
export async function GET(request: Request) {
  return handle(request);
}
