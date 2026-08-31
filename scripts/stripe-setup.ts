/**
 * Creates (or updates) the Genevieve App product catalogue in Stripe.
 *
 * Every price is created with a stable `lookup_key`, which is what the app
 * uses at checkout — so test and live modes can have different price ids
 * without any code change.
 *
 * Usage:  STRIPE_SECRET_KEY="sk_test_..." npm run stripe:setup
 *
 * Safe to re-run: existing products and prices with the same lookup_key are
 * reused rather than duplicated.
 */
import Stripe from "stripe";
import { PLANS, PLAN_ORDER, purchasablePrices } from "../src/lib/plans";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "STRIPE_SECRET_KEY is not set.\n" +
        'Usage: STRIPE_SECRET_KEY="sk_test_..." npm run stripe:setup',
    );
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
  console.log(`Setting up the Genevieve App catalogue in ${mode} mode…\n`);

  // One Stripe product per paid plan.
  const productIds = new Map<string, string>();

  for (const planKey of PLAN_ORDER) {
    if (planKey === "starter") continue;
    const plan = PLANS[planKey];

    // Look for an existing product under the current metadata key, then under
    // the legacy key, so a catalogue created before the rebrand is reused
    // rather than duplicated.
    const existing = await stripe.products.search({
      query: `metadata['genevieve_plan']:'${planKey}'`,
      limit: 1,
    });
    const legacy = existing.data[0]
      ? null
      : await stripe.products.search({
          query: `metadata['gen_money_plan']:'${planKey}'`,
          limit: 1,
        });

    let product = existing.data[0] ?? legacy?.data[0];
    if (product) {
      console.log(`• Product exists: ${plan.name} (${product.id})`);
      await stripe.products.update(product.id, {
        name: `Genevieve App ${plan.name}`,
        description: plan.tagline,
        metadata: { genevieve_plan: planKey },
      });
    } else {
      product = await stripe.products.create({
        name: `Genevieve App ${plan.name}`,
        description: plan.tagline,
        metadata: { genevieve_plan: planKey },
      });
      console.log(`✓ Created product: ${plan.name} (${product.id})`);
    }

    productIds.set(planKey, product.id);
  }

  console.log("");

  // One price per purchasable option, keyed by lookup_key.
  for (const price of purchasablePrices()) {
    const productId = productIds.get(price.planKey);
    if (!productId) continue;

    const found = await stripe.prices.list({
      lookup_keys: [price.lookupKey],
      limit: 1,
    });

    if (found.data[0]) {
      console.log(
        `• Price exists: ${price.lookupKey} → ${found.data[0].id} ` +
          `($${(price.amountCents / 100).toFixed(2)} AUD/${price.interval})`,
      );
      continue;
    }

    const created = await stripe.prices.create({
      product: productId,
      currency: "aud",
      unit_amount: price.amountCents,
      recurring: { interval: price.interval },
      lookup_key: price.lookupKey,
      transfer_lookup_key: true,
      nickname: `${PLANS[price.planKey].name} — ${price.label}`,
      metadata: {
        genevieve_plan: price.planKey,
        founding: price.founding ? "true" : "false",
      },
    });

    console.log(
      `✓ Created price: ${price.lookupKey} → ${created.id} ` +
        `($${(price.amountCents / 100).toFixed(2)} AUD/${price.interval})`,
    );
  }

  console.log("\n✓ Catalogue ready.\n");
  console.log("Next steps:");
  console.log("  1. Add a webhook endpoint pointing at https://<your-domain>/api/stripe/webhook");
  console.log("     Events: checkout.session.completed, customer.subscription.*, invoice.paid, invoice.payment_failed");
  console.log("  2. Save the signing secret:  wrangler secret put STRIPE_WEBHOOK_SECRET");
  console.log("  3. Enable the Customer Portal at https://dashboard.stripe.com/settings/billing/portal");

  if (mode === "TEST") {
    console.log("\nNote: this ran in TEST mode. Re-run with your live key before launch.");
  }
}

main().catch((error) => {
  console.error("Stripe setup failed:", error);
  process.exit(1);
});
