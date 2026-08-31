import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

/**
 * A Stripe client that works inside Cloudflare Workers.
 *
 * The default Node HTTP client uses `http.request`, which is not available in
 * the Workers runtime, so we install Stripe's fetch-based client explicitly.
 */
let cached: { key: string; stripe: Stripe } | null = null;

export function stripe(): Stripe {
  const key = requireEnv("STRIPE_SECRET_KEY");
  if (!cached || cached.key !== key) {
    cached = {
      key,
      stripe: new Stripe(key, {
        apiVersion: "2026-08-26.dahlia",
        httpClient: Stripe.createFetchHttpClient(),
        appInfo: { name: "Genevieve App", url: "https://genevieveapp.com.au" },
        maxNetworkRetries: 2,
      }),
    };
  }
  return cached.stripe;
}

/** Workers has no Node `crypto` sync primitives, so signatures verify async. */
export async function constructWebhookEvent(
  payload: string,
  signature: string,
  secret: string,
): Promise<Stripe.Event> {
  return stripe().webhooks.constructEventAsync(
    payload,
    signature,
    secret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}
