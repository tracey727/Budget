"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PricingTable } from "./PricingTable";

/**
 * The pricing page as three pages instead of one long scroll: the plans, the
 * full comparison, and the questions.
 */

const TABS = [
  { id: "plans", label: "Plans" },
  { id: "compare", label: "Compare" },
  { id: "questions", label: "Questions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const COMPARISON: Array<{
  label: string;
  starter: string;
  personal: string;
  professional: string;
}> = [
  { label: "Accounts", starter: "2", personal: "Unlimited", professional: "Unlimited" },
  { label: "Transactions a year", starter: "500", personal: "Unlimited", professional: "Unlimited" },
  { label: "Monthly budgets", starter: "5", personal: "Unlimited", professional: "Unlimited" },
  { label: "Savings goals", starter: "1", personal: "Unlimited", professional: "Unlimited" },
  { label: "CSV bank import", starter: "—", personal: "✓", professional: "✓" },
  { label: "Full reports", starter: "—", personal: "✓", professional: "✓" },
  { label: "Recurring bills", starter: "—", personal: "✓", professional: "✓" },
  { label: "CSV export", starter: "—", personal: "✓", professional: "✓" },
  { label: "Business/personal split", starter: "—", personal: "—", professional: "✓" },
  { label: "GST & BAS summaries", starter: "—", personal: "—", professional: "✓" },
  { label: "Deductible tagging", starter: "—", personal: "—", professional: "✓" },
  { label: "Priority support", starter: "—", personal: "—", professional: "✓" },
];

const FAQ = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Starter plan is free forever and does not ask for card details. You only enter payment details if you choose to upgrade.",
  },
  {
    q: "What does the founding offer include?",
    a: "Founding pricing is a launch promotion covering your first year — $69 for Personal Premium or $139 for Professional. After the first year your subscription renews at the standard annual rate ($99 or $199), and you can cancel before renewal at any time.",
  },
  {
    q: "Are prices in Australian dollars?",
    a: "Yes. Every price is in Australian dollars. Genevieve App is not registered for GST, so no GST is added — the price you see is the total you pay, with no international transaction fee.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade, downgrade or switch between monthly and annual at any time from the billing page. Changes are prorated by Stripe.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Nothing is deleted. Your account reverts to the Starter plan, your records stay in place, and you can export everything to CSV before or after cancelling.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Genevieve App is a budgeting and record-keeping tool. It does not provide financial product advice or take your personal circumstances into account.",
  },
];

function isTabId(v: string): v is TabId {
  return TABS.some((t) => t.id === v);
}

export function PagedPricing({ signedIn }: { signedIn: boolean }) {
  const [active, setActive] = useState<TabId>("plans");

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "");
      if (isTabId(hash)) setActive(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const choose = useCallback((id: TabId) => {
    setActive(id);
    window.history.replaceState(null, "", id === "plans" ? " " : `#${id}`);
  }, []);

  const index = TABS.findIndex((t) => t.id === active);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="gm-display text-4xl font-semibold sm:text-5xl">
          Simple pricing, in Australian dollars
        </h1>
        <p className="gm-muted mt-3">
          Start free. No credit card required. Save with an annual membership.
          No GST added — the price you see is the price you pay.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="gm-toggle-bar" role="tablist" aria-label="Pricing sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`ptab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`ppanel-${tab.id}`}
              className="gm-toggle"
              onClick={() => choose(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gm-rule mx-auto my-8 w-full max-w-sm" />

      {active === "plans" && (
        <section
          className="gm-panel"
          role="tabpanel"
          id="ppanel-plans"
          aria-labelledby="ptab-plans"
        >
          <div className="mx-auto mb-9 max-w-3xl rounded-xl p-5 text-center"
            style={{
              border: "1px solid var(--gold-line)",
              background: "rgba(90, 28, 43, 0.35)",
            }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--gold)" }}
            >
              Launch promotion — founding members
            </p>
            <p className="gm-display mt-2 text-xl font-semibold">
              Personal Premium $69 for your first year ·{" "}
              <span className="whitespace-nowrap">
                Professional $139 for your first year
              </span>
            </p>
            <p className="gm-muted mt-2 text-sm">
              Choose <strong>Annual</strong> below to claim founding pricing.
              Renews at the standard annual rate ($99 or $199) after the first
              year. Cancel any time.
            </p>
            <Link
              href="/subscriptions"
              className="gm-muted mt-2 inline-block text-xs underline hover:text-brand-600"
            >
              Read how founding renewal works
            </Link>
          </div>

          <PricingTable signedIn={signedIn} />
        </section>
      )}

      {active === "compare" && (
        <section
          className="gm-panel"
          role="tabpanel"
          id="ppanel-compare"
          aria-labelledby="ptab-compare"
        >
          <div className="gm-card gm-scroll-x p-0">
            <table className="gm-table min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Starter</th>
                  <th scope="col">Personal Premium</th>
                  <th scope="col">Professional</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold">Monthly</td>
                  <td className="font-semibold">FREE</td>
                  <td className="font-semibold">$9.99 AUD</td>
                  <td className="font-semibold">$19.99 AUD</td>
                </tr>
                <tr>
                  <td className="font-semibold">Annual</td>
                  <td className="font-semibold">FREE</td>
                  <td className="font-semibold">$99 AUD</td>
                  <td className="font-semibold">$199 AUD</td>
                </tr>
                <tr>
                  <td className="font-semibold">Founding (first year)</td>
                  <td>—</td>
                  <td className="font-semibold text-brand-600">$69 AUD</td>
                  <td className="font-semibold text-brand-600">$139 AUD</td>
                </tr>
                {COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.starter}</td>
                    <td>{row.personal}</td>
                    <td>{row.professional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active === "questions" && (
        <section
          className="gm-panel mx-auto max-w-3xl"
          role="tabpanel"
          id="ppanel-questions"
          aria-labelledby="ptab-questions"
        >
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="gm-card">
                <summary
                  className="gm-display cursor-pointer list-none text-lg font-semibold"
                  style={{ color: "var(--gold-bright)" }}
                >
                  {item.q}
                </summary>
                <p className="gm-muted mt-2.5 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          type="button"
          className="gm-step"
          disabled={index === 0}
          onClick={() => index > 0 && choose(TABS[index - 1].id)}
        >
          <span aria-hidden>←</span> Back
        </button>
        <span
          className="text-[11px] uppercase tracking-[0.2em]"
          style={{ color: "var(--cream-faint)" }}
        >
          {index + 1} of {TABS.length}
        </span>
        <button
          type="button"
          className="gm-step"
          disabled={index === TABS.length - 1}
          onClick={() => index < TABS.length - 1 && choose(TABS[index + 1].id)}
        >
          Next <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
