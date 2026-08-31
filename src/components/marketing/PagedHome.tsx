"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * The home page as a set of pages rather than one long scroll.
 *
 * Each section is a panel reached by a gold toggle, with a stepper underneath
 * so it can be read straight through without scrolling. The tab id is mirrored
 * into the URL hash, so the header's Features and Security links still work
 * and a panel can be linked to directly.
 */

const TABS = [
  { id: "welcome", label: "Welcome" },
  { id: "features", label: "Features" },
  { id: "security", label: "Security" },
  { id: "start", label: "Get started" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FEATURES = [
  {
    title: "Every account in one place",
    body: "Transaction, savings, offset, credit and loan accounts side by side, with a live balance and net position.",
  },
  {
    title: "Budgets that hold up",
    body: "Set a monthly limit per category and watch the bar fill. Roll unspent amounts forward so a quiet month funds a busy one.",
  },
  {
    title: "Import your bank statements",
    body: "Drop in a CSV from any Australian bank. Genevieve maps the columns, skips duplicates and files everything by category.",
  },
  {
    title: "Bills before they bite",
    body: "Weekly, fortnightly, quarterly and annual bills, with everything due in the next fortnight shown before it lands.",
  },
  {
    title: "Goals with a real date",
    body: "Name the goal, set the target and the date, and Genevieve works out what to put aside each payday.",
  },
  {
    title: "Sole trader ready",
    body: "Split business from personal, tag deductible spend, and track GST across the Australian financial year.",
  },
];

const ASSURANCES = [
  {
    title: "We never hold your bank logins",
    body: "No screen-scraping and no stored banking credentials. You stay in control by importing statements yourself.",
  },
  {
    title: "Encrypted in transit and at rest",
    body: "Served over HTTPS on Cloudflare's global network, with data in an encrypted Neon Postgres database.",
  },
  {
    title: "Payments handled by Stripe",
    body: "Card details go straight to Stripe, a PCI DSS Level 1 provider. Genevieve never sees your card number.",
  },
  {
    title: "Export or delete any time",
    body: "Your records are yours. Export everything to CSV, or delete your account and we remove your data.",
  },
];

function isTabId(value: string): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function PagedHome({ signedIn }: { signedIn: boolean }) {
  const [active, setActive] = useState<TabId>("welcome");

  // Follow the URL hash so the header links and the back button both work.
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
    // replaceState keeps the back button meaningful rather than filling it
    // with one entry per toggle.
    window.history.replaceState(null, "", id === "welcome" ? " " : `#${id}`);
  }, []);

  const index = TABS.findIndex((t) => t.id === active);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      {/* toggles */}
      <div className="flex justify-center">
        <div className="gm-toggle-bar" role="tablist" aria-label="Sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`panel-${tab.id}`}
              className="gm-toggle"
              onClick={() => choose(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gm-rule mx-auto my-8 w-full max-w-sm" />

      {/* ------------------------------------------------------------ welcome */}
      {active === "welcome" && (
        <section
          className="gm-panel flex flex-col items-center text-center"
          role="tabpanel"
          id="panel-welcome"
          aria-labelledby="tab-welcome"
        >
          <Logo size="lg" showWordmark={false} />

          <h1 className="gm-script mt-6 text-5xl leading-[1.05] sm:text-6xl">
            Genevieve
            <span
              className="ml-1.5 align-super font-sans text-[0.22em] tracking-widest"
              aria-label="trade mark pending"
            >
              TM
            </span>
          </h1>

          <p
            className="gm-display mt-2 text-xs font-semibold uppercase tracking-[0.42em]"
            style={{ color: "var(--cream-dim)" }}
          >
            Budget App
          </p>

          <h2 className="gm-display mt-7 text-balance text-3xl font-semibold leading-tight sm:text-[2.5rem]">
            Take Control of{" "}
            <span style={{ color: "var(--gold)" }}>Every Dollar</span>
          </h2>

          <p className="gm-muted mt-4 max-w-xl text-pretty leading-relaxed">
            See exactly where your money goes, set budgets that actually hold,
            and reach your goals sooner. Start free — no credit card required.
          </p>

          <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup"
              className="gm-btn-primary w-full px-8 py-3.5 text-base sm:w-auto"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="gm-btn-secondary w-full px-8 py-3.5 text-base sm:w-auto"
            >
              See pricing
            </Link>
          </div>

          <p
            className="mt-5 text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--cream-faint)" }}
          >
            No credit card · Cancel any time · Your data stays yours
          </p>

          <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            {[
              { label: "Tracked this month", value: "$4,820" },
              { label: "Left to spend", value: "$1,145" },
              { label: "Saved toward goals", value: "$12,400" },
            ].map((tile) => (
              <div key={tile.label} className="gm-card py-4 text-center">
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: "var(--gold)" }}
                >
                  {tile.label}
                </p>
                <p className="gm-display mt-1 text-3xl font-semibold">{tile.value}</p>
              </div>
            ))}
          </div>
          <p
            className="mt-3 text-[10px]"
            style={{ color: "var(--cream-faint)" }}
          >
            Illustrative figures. Your dashboard shows your own numbers.
          </p>
        </section>
      )}

      {/* ----------------------------------------------------------- features */}
      {active === "features" && (
        <section
          className="gm-panel"
          role="tabpanel"
          id="panel-features"
          aria-labelledby="tab-features"
        >
          <div className="text-center">
            <h2 className="gm-display text-3xl font-semibold sm:text-4xl">
              Everything you need to run your money
            </h2>
            <p className="gm-muted mt-2 text-sm">
              No spreadsheets. No guesswork. No overseas currency conversions.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="gm-card py-4">
                <h3
                  className="gm-display text-lg font-semibold"
                  style={{ color: "var(--gold-bright)" }}
                >
                  {feature.title}
                </h3>
                <p className="gm-muted mt-1.5 text-[13px] leading-relaxed">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- security */}
      {active === "security" && (
        <section
          className="gm-panel"
          role="tabpanel"
          id="panel-security"
          aria-labelledby="tab-security"
        >
          <div className="text-center">
            <h2 className="gm-display text-3xl font-semibold sm:text-4xl">
              Your money data, treated with care
            </h2>
            <p className="gm-muted mt-2 text-sm">
              What we hold, what we never touch, and what you can take away.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            {ASSURANCES.map((item) => (
              <div key={item.title} className="gm-card py-4">
                <h3
                  className="gm-display text-lg font-semibold"
                  style={{ color: "var(--gold-bright)" }}
                >
                  {item.title}
                </h3>
                <p className="gm-muted mt-1.5 text-[13px] leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- start */}
      {active === "start" && (
        <section
          className="gm-panel"
          role="tabpanel"
          id="panel-start"
          aria-labelledby="tab-start"
        >
          <div className="gm-card mx-auto max-w-2xl px-6 py-11 text-center">
            <Logo size="md" showWordmark={false} className="justify-center" />
            <h2 className="gm-display mt-5 text-3xl font-semibold sm:text-4xl">
              Take control of every dollar
            </h2>
            <div className="gm-rule mx-auto my-5 w-32" />
            <p className="gm-muted mx-auto max-w-md">
              Start free today. Upgrade when you are ready — from $9.99 a month,
              in Australian dollars, with no GST added.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={signedIn ? "/app" : "/signup"}
                className="gm-btn-primary w-full px-8 py-3.5 text-base sm:w-auto"
              >
                {signedIn ? "Open the app" : "Start Free"}
              </Link>
              <Link
                href="/pricing"
                className="gm-btn-secondary w-full px-8 py-3.5 text-base sm:w-auto"
              >
                Compare plans
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* stepper */}
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
