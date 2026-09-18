/**
 * Runtime environment access.
 *
 * On Cloudflare Workers, secrets are NOT present on the module-scope
 * `process.env` snapshot at import time the way they are in Node. The
 * OpenNext Cloudflare adapter populates `process.env` per-request from the
 * Worker bindings, so every read must happen lazily inside a request scope —
 * never at module top level.
 */

export type AppEnv = {
  DATABASE_URL: string;
  SESSION_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  NEXT_PUBLIC_APP_URL: string;
  /** Open banking (optional — the demo bank is used when absent). */
  BASIQ_API_KEY: string;
  BASIQ_WEBHOOK_SECRET: string;
  /** Shared secret for the scheduled sync endpoint. */
  CRON_SECRET: string;
};

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

function read(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === "") return undefined;
  return value;
}

/** Throws a descriptive error if a required secret is missing. */
export function requireEnv(key: (typeof REQUIRED_KEYS)[number]): string {
  const value = read(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}". ` +
        `Set it locally in .dev.vars and in production with: wrangler secret put ${key}`,
    );
  }
  return value;
}

/** The public origin of the deployment, used for redirects and Stripe URLs. */
export function appUrl(): string {
  return (read("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}

/** True when Stripe is configured; the app degrades gracefully when it isn't. */
export function stripeConfigured(): boolean {
  return Boolean(read("STRIPE_SECRET_KEY"));
}

/** True when the scheduled sync endpoint is protected and therefore usable. */
export function cronConfigured(): boolean {
  return Boolean(read("CRON_SECRET"));
}

/** The shared secret the scheduled sync endpoint expects, if one is set. */
export function cronSecret(): string | undefined {
  return read("CRON_SECRET");
}

/** Reports which required variables are absent — used by the health endpoint. */
export function missingEnv(): string[] {
  return REQUIRED_KEYS.filter((key) => !read(key));
}
