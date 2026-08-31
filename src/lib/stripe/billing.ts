import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { appUrl } from "@/lib/env";
import { planFromLookupKey, type PlanKey } from "@/lib/plans";
import { stripe } from "./client";

/** Finds or creates the Stripe customer for a user and persists the id. */
export async function ensureCustomer(user: {
  id: string;
  email: string;
  fullName: string;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: user.email,
    name: user.fullName,
    metadata: { userId: user.id },
  });

  await db()
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return customer.id;
}

/** Resolves a price by its lookup_key, which is stable across environments. */
export async function priceIdForLookupKey(lookupKey: string): Promise<string> {
  const found = await stripe().prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = found.data[0];
  if (!price) {
    throw new Error(
      `No active Stripe price with lookup_key "${lookupKey}". ` +
        `Run \`npm run stripe:setup\` to create the Gen Money catalogue.`,
    );
  }
  return price.id;
}

export async function createCheckoutSession(opts: {
  user: { id: string; email: string; fullName: string; stripeCustomerId: string | null };
  lookupKey: string;
  trialDays?: number;
}): Promise<string> {
  const customerId = await ensureCustomer(opts.user);
  const priceId = await priceIdForLookupKey(opts.lookupKey);
  const base = appUrl();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Australian consumer pricing is GST-inclusive; let Stripe show it that way.
    currency: "aud",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: opts.user.id,
    success_url: `${base}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pricing?checkout=cancelled`,
    subscription_data: {
      metadata: { userId: opts.user.id, lookupKey: opts.lookupKey },
      ...(opts.trialDays ? { trial_period_days: opts.trialDays } : {}),
    },
    metadata: { userId: opts.user.id, lookupKey: opts.lookupKey },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalSession(customerId: string): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/app/billing`,
  });
  return session.url;
}

function toDate(seconds: number | null | undefined): Date | null {
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/**
 * Mirrors a Stripe subscription into our database and recomputes the user's
 * plan. This is the single place plan state changes, so checkout, webhooks and
 * manual reconciliation all converge on the same result.
 */
export async function syncSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  const item = subscription.items.data[0];
  if (!item) return;

  const price = item.price;
  const lookupKey = price.lookup_key ?? subscription.metadata?.lookupKey ?? "";
  const planKey: PlanKey = planFromLookupKey(lookupKey);

  const userId = await resolveUserId(subscription);
  if (!userId) return;

  // `current_period_end` lives on the subscription item in recent API
  // versions; fall back to the subscription for older payloads.
  const periodEnd =
    toDate(item.current_period_end) ??
    toDate((subscription as unknown as { current_period_end?: number }).current_period_end);

  const productId =
    typeof price.product === "string" ? price.product : price.product?.id ?? null;

  await db()
    .insert(subscriptions)
    .values({
      id: subscription.id,
      userId,
      status: subscription.status,
      priceId: price.id,
      productId,
      planKey,
      interval: price.recurring?.interval === "year" ? "year" : "month",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: toDate(subscription.canceled_at),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        status: subscription.status,
        priceId: price.id,
        productId,
        planKey,
        interval: price.recurring?.interval === "year" ? "year" : "month",
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: toDate(subscription.canceled_at),
        updatedAt: new Date(),
      },
    });

  // A subscription that has ended drops the user back to Starter rather than
  // locking them out — their data stays, the paid features switch off.
  const terminal = subscription.status === "canceled" ||
    subscription.status === "incomplete_expired" ||
    subscription.status === "unpaid";

  await db()
    .update(users)
    .set({
      plan: terminal ? "starter" : planKey,
      planStatus: terminal ? "none" : subscription.status,
      planRenewsAt: terminal ? null : periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/** Matches a Stripe subscription back to a Gen Money user. */
async function resolveUserId(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.userId;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const rows = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  return rows[0]?.id ?? null;
}
