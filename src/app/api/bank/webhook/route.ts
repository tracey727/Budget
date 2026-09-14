import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankConnections, bankWebhookEvents } from "@/lib/db/schema";
import { activeProvider, activeProviderKey } from "@/lib/bank/provider";
import { syncConnection } from "@/lib/bank/sync";

export const dynamic = "force-dynamic";

/**
 * Push notifications from the data recipient.
 *
 * This is what makes results automatic rather than polled: when the bank
 * settles a payment, the provider posts here within seconds and the ledger is
 * brought up to date before the person next opens the app.
 *
 * Two rules, both learned from the Stripe webhook next door:
 *   — verify the signature before trusting a byte of the body;
 *   — record the event id first, so a redelivery is a no-op rather than a
 *     second pass over the same transactions.
 */
export async function POST(request: Request) {
  const provider = activeProvider();
  const rawBody = await request.text();

  const verified = await provider.verifyWebhook(request, rawBody);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.reason }, { status: 400 });
  }

  const recorded = await db()
    .insert(bankWebhookEvents)
    .values({
      id: `${activeProviderKey()}:${verified.eventId}`,
      provider: activeProviderKey(),
      type: verified.type,
      payload: verified.payload ?? null,
    })
    .onConflictDoNothing({ target: bankWebhookEvents.id })
    .returning({ id: bankWebhookEvents.id });

  if (recorded.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Events that carry no connection are informational (institution status,
  // provider maintenance); acknowledging them is the whole job.
  if (verified.providerConnectionIds.length === 0) {
    return NextResponse.json({ received: true, synced: 0 });
  }

  const links = await db()
    .select()
    .from(bankConnections)
    .where(
      inArray(
        bankConnections.providerConnectionId,
        verified.providerConnectionIds,
      ),
    );

  let synced = 0;
  for (const link of links) {
    if (link.provider !== activeProviderKey()) continue;

    // A revocation done at the bank has to be honoured here immediately,
    // without waiting for the next sync to notice the data has stopped.
    if (/revok|delete|disconnect/i.test(verified.type)) {
      await db()
        .update(bankConnections)
        .set({
          status: "revoked",
          lastError: "Your bank reported this connection as disconnected.",
          updatedAt: new Date(),
        })
        .where(eq(bankConnections.id, link.id));
      continue;
    }

    await syncConnection(link, "webhook");
    synced += 1;
  }

  return NextResponse.json({ received: true, synced });
}
