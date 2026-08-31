import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "Every account in one place",
    body: "Transaction, savings, offset, credit and loan accounts side by side, with a live balance and net position updated as you go.",
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
    body: "Track weekly, fortnightly, quarterly and annual bills. See what is due in the next fortnight before it lands.",
  },
  {
    title: "Goals with a real date",
    body: "Name the goal, set the target and the date, and Genevieve works out what you need to put aside each payday.",
  },
  {
    title: "Sole trader ready",
    body: "Split business from personal, tag deductible spend, and track GST with BAS-ready quarterly summaries across the Australian financial year.",
  },
];

const ASSURANCES = [
  {
    title: "We never hold your bank logins",
    body: "Genevieve does not screen-scrape or store banking credentials. You stay in control by importing statements yourself.",
  },
  {
    title: "Encrypted in transit and at rest",
    body: "Served over HTTPS on Cloudflare's global network, with data stored in an encrypted Neon Postgres database.",
  },
  {
    title: "Payments handled by Stripe",
    body: "Card details go straight to Stripe, a PCI DSS Level 1 provider. Genevieve never sees or stores your card number.",
  },
  {
    title: "Export or delete any time",
    body: "Your records are yours. Export everything to CSV, or delete your account and we remove your data.",
  },
];

export default async function HomePage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(user)} />

      <main className="flex-1">
        {/* ------------------------------------------------------------ hero */}
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:pt-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <Logo size="lg" showWordmark={false} />

            <h1 className="gm-script mt-7 text-5xl leading-[1.05] sm:text-7xl">
              Genevieve
              <span
                className="ml-1.5 align-super font-sans text-[0.22em] tracking-widest"
                aria-label="trade mark pending"
              >
                TM
              </span>
            </h1>

            <p
              className="gm-display mt-3 text-sm font-semibold uppercase tracking-[0.42em]"
              style={{ color: "var(--cream-dim)" }}
            >
              Budget App
            </p>

            <div className="gm-rule my-8 w-full max-w-xs" />

            <h2 className="gm-display text-balance text-3xl font-semibold leading-tight sm:text-[2.75rem]">
              Take Control of{" "}
              <span style={{ color: "var(--gold)" }}>Every Dollar</span>
            </h2>

            <p className="gm-muted mt-5 max-w-xl text-pretty text-[1.05rem] leading-relaxed">
              See exactly where your money goes, set budgets that actually hold,
              and reach your goals sooner. Start free — no credit card required.
            </p>

            <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
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
              className="mt-5 text-xs uppercase tracking-[0.18em]"
              style={{ color: "var(--cream-faint)" }}
            >
              No credit card · Cancel any time · Your data stays yours
            </p>
          </div>

          {/* Snapshot tiles */}
          <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { label: "Tracked this month", value: "$4,820" },
              { label: "Left to spend", value: "$1,145" },
              { label: "Saved toward goals", value: "$12,400" },
            ].map((tile) => (
              <div key={tile.label} className="gm-card text-center">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: "var(--gold)" }}
                >
                  {tile.label}
                </p>
                <p className="gm-display mt-2 text-4xl font-semibold">{tile.value}</p>
              </div>
            ))}
          </div>
          <p
            className="mt-4 text-center text-[11px]"
            style={{ color: "var(--cream-faint)" }}
          >
            Illustrative figures. Your dashboard shows your own numbers.
          </p>
        </section>

        {/* -------------------------------------------------------- features */}
        <section id="features" className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.3em]"
                style={{ color: "var(--gold)" }}
              >
                What it does
              </p>
              <h2 className="gm-display mt-3 text-3xl font-semibold sm:text-4xl">
                Everything you need to run your money
              </h2>
              <div className="gm-rule mx-auto my-7 w-40" />
              <p className="gm-muted">
                No spreadsheets. No guesswork. No overseas currency conversions.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="gm-card">
                  <h3
                    className="gm-display text-xl font-semibold"
                    style={{ color: "var(--gold-bright)" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="gm-muted mt-2.5 text-sm leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- security */}
        <section id="security" className="py-20">
          <div className="mx-auto max-w-4xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.3em]"
                style={{ color: "var(--gold)" }}
              >
                Handled properly
              </p>
              <h2 className="gm-display mt-3 text-3xl font-semibold sm:text-4xl">
                Your money data, treated with care
              </h2>
              <div className="gm-rule mx-auto my-7 w-40" />
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {ASSURANCES.map((item) => (
                <div key={item.title} className="gm-card">
                  <h3
                    className="gm-display text-lg font-semibold"
                    style={{ color: "var(--gold-bright)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="gm-muted mt-2 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="pb-24">
          <div className="mx-auto max-w-3xl px-4">
            <div className="gm-card px-6 py-12 text-center">
              <Logo size="md" showWordmark={false} className="justify-center" />
              <h2 className="gm-display mt-6 text-3xl font-semibold sm:text-4xl">
                Take control of every dollar
              </h2>
              <div className="gm-rule mx-auto my-6 w-32" />
              <p className="gm-muted mx-auto max-w-md">
                Start free today. Upgrade when you are ready — from $9.99 a month,
                in Australian dollars, with no GST added.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
                  Compare plans
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
