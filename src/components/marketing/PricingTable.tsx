"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, PLAN_ORDER, type BillingInterval } from "@/lib/plans";

export function PricingTable({ signedIn }: { signedIn: boolean }) {
  const [interval, setInterval] = useState<BillingInterval>("month");

  return (
    <div>
      {/* Monthly / Annual toggle */}
      <div className="mb-10 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex rounded-full border border-[var(--gm-border)] bg-[var(--gm-surface)] p-1"
        >
          {(
            [
              { key: "month", label: "Monthly" },
              { key: "year", label: "Annual" },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={interval === option.key}
              onClick={() => setInterval(option.key)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                interval === option.key
                  ? "bg-brand-600 text-white"
                  : "gm-muted hover:text-brand-600"
              }`}
            >
              {option.label}
              {option.key === "year" && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                    interval === "year"
                      ? "bg-white/20 text-white"
                      : "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  }`}
                >
                  Save
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const price = interval === "month" ? plan.monthly : plan.annual;
          const isFree = key === "starter";
          const showFounding = interval === "year" && plan.founding;

          return (
            <div
              key={key}
              className={`gm-card relative flex flex-col ${
                plan.highlight ? "ring-2 ring-brand-500" : ""
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-xl font-black">{plan.name}</h3>
              <p className="gm-muted mt-1 text-sm">{plan.tagline}</p>

              <div className="mt-5">
                <span className="text-4xl font-black">
                  {isFree ? "FREE" : price?.label}
                </span>
                {!isFree && (
                  <span className="gm-muted ml-1 text-sm">
                    AUD /{interval === "month" ? "month" : "year"}
                  </span>
                )}
              </div>

              {price?.note && (
                <p className="mt-1 text-xs font-semibold text-brand-600">{price.note}</p>
              )}

              {showFounding && plan.founding && (
                <div className="mt-3 rounded-lg border border-brand-500/40 bg-brand-500/10 p-3">
                  <p className="text-sm font-bold text-brand-700 dark:text-brand-300">
                    Founding offer: {plan.founding.label}
                  </p>
                  <p className="gm-muted mt-0.5 text-xs">{plan.founding.note}</p>
                  <p className="gm-muted mt-1.5 text-xs">
                    Renews automatically at {price?.label}/year after the first
                    year unless cancelled.{" "}
                    <Link href="/subscriptions" className="underline hover:text-brand-600">
                      Details
                    </Link>
                  </p>
                </div>
              )}

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span aria-hidden className="mt-0.5 font-bold text-brand-600">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                {isFree ? (
                  <Link
                    href={signedIn ? "/app" : "/signup"}
                    className="gm-btn-secondary w-full"
                  >
                    {signedIn ? "Open app" : "Start Free"}
                  </Link>
                ) : (
                  <>
                    <CheckoutButton
                      lookupKey={
                        (showFounding && plan.founding
                          ? plan.founding.lookupKey
                          : price?.lookupKey) ?? ""
                      }
                      signedIn={signedIn}
                      highlight={Boolean(plan.highlight)}
                    />
                    {showFounding && price && (
                      <CheckoutButton
                        lookupKey={price.lookupKey}
                        signedIn={signedIn}
                        highlight={false}
                        label={`Or pay standard ${price.label}/year`}
                        subtle
                      />
                    )}
                  </>
                )}
              </div>

              <p className="gm-muted mt-3 text-center text-xs">{plan.purpose}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckoutButton({
  lookupKey,
  signedIn,
  highlight,
  label,
  subtle = false,
}: {
  lookupKey: string;
  signedIn: boolean;
  highlight: boolean;
  label?: string;
  subtle?: boolean;
}) {
  // Signed-out visitors go through sign-up first, then straight to checkout.
  const href = signedIn
    ? `/api/billing/checkout?plan=${encodeURIComponent(lookupKey)}`
    : `/signup?plan=${encodeURIComponent(lookupKey)}`;

  if (subtle) {
    return (
      <Link
        href={href}
        className="gm-muted mt-2 block text-center text-xs underline hover:text-brand-600"
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`${highlight ? "gm-btn-primary" : "gm-btn-secondary"} w-full`}
    >
      {label ?? "Choose plan"}
    </Link>
  );
}
