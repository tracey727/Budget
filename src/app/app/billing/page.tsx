import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { PLANS, PLAN_ORDER, formatAud } from "@/lib/plans";
import { formatDateLong } from "@/lib/dates";
import { stripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "billing-unavailable":
    "Billing is not configured on this deployment yet. Please try again shortly.",
  "checkout-failed":
    "We could not start checkout. Please try again, or contact support if it keeps happening.",
  "portal-failed": "We could not open the billing portal. Please try again.",
  "no-subscription": "You do not have a paid subscription to manage yet.",
  "unknown-plan": "That plan is not available.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const rows = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const subscription = rows[0];
  const current = PLANS[user.activePlan];
  const configured = stripeConfigured();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Billing</h1>

      {params.checkout === "success" && (
        <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-700 dark:text-brand-300">
          Thanks for subscribing. Your plan is active — it can take a few seconds
          to appear here while Stripe confirms the payment.
        </p>
      )}

      {params.error && ERROR_MESSAGES[params.error] && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          {ERROR_MESSAGES[params.error]}
        </p>
      )}

      {!configured && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Billing is not configured on this deployment. Set{" "}
          <code className="font-mono text-xs">STRIPE_SECRET_KEY</code> to enable
          upgrades.
        </p>
      )}

      {/* Current plan */}
      <div className="gm-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="gm-muted text-xs font-semibold uppercase tracking-wide">
              Current plan
            </p>
            <h2 className="mt-1 text-2xl font-black">{current.name}</h2>
            <p className="gm-muted mt-1 text-sm">{current.tagline}</p>

            {subscription && user.activePlan !== "starter" && (
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="gm-muted">Status:</dt>
                  <dd className="font-medium capitalize">
                    {subscription.status.replace(/_/g, " ")}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="gm-muted">Billing:</dt>
                  <dd className="font-medium">
                    {subscription.interval === "year" ? "Annual" : "Monthly"}
                  </dd>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="flex gap-2">
                    <dt className="gm-muted">
                      {subscription.cancelAtPeriodEnd ? "Ends:" : "Renews:"}
                    </dt>
                    <dd className="font-medium">
                      {formatDateLong(
                        subscription.currentPeriodEnd.toISOString().slice(0, 10),
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {subscription?.cancelAtPeriodEnd && (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Your subscription is set to cancel at the end of the current
                period. You will move to the free Starter plan — your data stays.
              </p>
            )}
          </div>

          {user.stripeCustomerId && configured && (
            <Link href="/api/billing/portal" className="gm-btn-secondary shrink-0">
              Manage subscription
            </Link>
          )}
        </div>
      </div>

      {/* Plan options */}
      <div>
        <h2 className="mb-4 font-bold">
          {user.activePlan === "starter" ? "Upgrade your plan" : "Change your plan"}
        </h2>

        <div className="grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const isCurrent = key === user.activePlan;

            return (
              <div
                key={key}
                className={`gm-card flex flex-col ${
                  isCurrent ? "ring-2 ring-brand-500" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black">{plan.name}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                      Current
                    </span>
                  )}
                </div>

                <p className="mt-3 text-2xl font-black">
                  {key === "starter" ? "FREE" : plan.monthly?.label}
                  {key !== "starter" && (
                    <span className="gm-muted ml-1 text-sm font-normal">/month</span>
                  )}
                </p>
                {key !== "starter" && plan.annual && (
                  <p className="gm-muted text-xs">
                    or {plan.annual.label} a year ({formatAud(plan.annual.amountCents)})
                  </p>
                )}

                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden className="text-brand-600">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {key !== "starter" && !isCurrent && configured && (
                  <div className="mt-5 space-y-2">
                    {plan.monthly && (
                      <Link
                        href={`/api/billing/checkout?plan=${plan.monthly.lookupKey}`}
                        className="gm-btn-primary w-full"
                      >
                        {plan.monthly.label}/month
                      </Link>
                    )}
                    {plan.annual && (
                      <Link
                        href={`/api/billing/checkout?plan=${plan.annual.lookupKey}`}
                        className="gm-btn-secondary w-full"
                      >
                        {plan.annual.label}/year
                      </Link>
                    )}
                    {plan.founding && (
                      <>
                        <Link
                          href={`/api/billing/checkout?plan=${plan.founding.lookupKey}`}
                          className="block text-center text-xs font-semibold text-brand-600 hover:underline"
                        >
                          Founding offer: {plan.founding.label}
                        </Link>
                        <p className="gm-muted text-center text-[11px] leading-snug">
                          Then {plan.annual?.label}/year. Renews automatically
                          until cancelled.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="gm-muted text-xs leading-relaxed">
        All prices are in Australian dollars and include GST where applicable.
        Payments are processed by Stripe — Gen Money never sees your card
        details. You can cancel at any time from the billing portal; your
        subscription runs to the end of the period you have paid for. Founding
        prices apply to the first year only, then renew at the standard annual
        rate. Full details are in our{" "}
        <Link href="/subscriptions" className="underline hover:text-brand-600">
          Subscription &amp; Refund Policy
        </Link>
        .
      </p>
    </div>
  );
}
