import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { stripeEvents } from "@/lib/db/schema";
import { requireEnv } from "@/lib/env";
import { constructWebhookEvent, stripe } from "@/lib/stripe/client";
import { syncSubscription } from "@/lib/stripe/billing";

export const dynamic = "force-dynamic";

/** Events that change what a customer is entitled to. */
const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // The raw body is required — parsing it first would break the signature.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await constructWebhookEvent(
      payload,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    console.error("stripe signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Stripe delivers at least once, and retries on any non-2xx. Recording the
  // event id first makes replays a no-op rather than a double upgrade.
  const claimed = await db()
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing({ target: stripeEvents.id })
    .returning({ id: stripeEvents.id });

  if (claimed.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    console.error(`stripe webhook ${event.type} failed`, error);
    // Release the idempotency claim so Stripe's retry can try again, rather
    // than the event being permanently swallowed.
    await db()
      .delete(stripeEvents)
      .where(eq(stripeEvents.id, event.id))
      .catch(() => undefined);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) return;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

      const subscription = await stripe().subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object);
      return;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subscriptionId = subscriptionIdFromInvoice(invoice);
      if (!subscriptionId) return;

      // Re-read the subscription so status, period end and plan all come from
      // Stripe rather than being inferred from the invoice.
      const subscription = await stripe().subscriptions.retrieve(subscriptionId);
      await syncSubscription(subscription);
      return;
    }

    default:
      return;
  }
}

/**
 * `invoice.subscription` was removed from the top level in recent API
 * versions; the subscription now hangs off the invoice's line items.
 */
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const direct = (invoice as unknown as { subscription?: string | { id: string } })
    .subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") return direct.id;

  for (const line of invoice.lines?.data ?? []) {
    const parent = (
      line as unknown as {
        parent?: { subscription_item_details?: { subscription?: string } };
      }
    ).parent;
    const fromParent = parent?.subscription_item_details?.subscription;
    if (typeof fromParent === "string") return fromParent;
  }

  return null;
}
