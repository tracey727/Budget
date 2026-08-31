import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
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
    body: "Drop in a CSV from any Australian bank. Genevieve App maps the columns, skips duplicates and files everything by category.",
  },
  {
    title: "Bills before they bite",
    body: "Track weekly, fortnightly, quarterly and annual bills. See what is due in the next fortnight before it lands.",
  },
  {
    title: "Goals with a real date",
    body: "Name the goal, set the target and the date, and Genevieve App works out what you need to put aside each payday.",
  },
  {
    title: "Sole trader ready",
    body: "Split business from personal, tag deductible spend, and track GST with BAS-ready quarterly summaries across the Australian financial year.",
  },
];

export default async function HomePage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(user)} />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Built for Australia · Priced in AUD
            </p>
            <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              GENEVIEVE App — Take Control of{" "}
              <span className="text-brand-600">Every Dollar</span>
            </h1>
            <p className="gm-muted mx-auto mt-5 max-w-2xl text-pretty text-lg">
              See exactly where your money goes, set budgets that actually hold,
              and reach your goals sooner. Start free. No credit card required.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="gm-btn-primary w-full px-6 py-3 text-base sm:w-auto">
                Start Free
              </Link>
              <Link href="/pricing" className="gm-btn-secondary w-full px-6 py-3 text-base sm:w-auto">
                See pricing
              </Link>
            </div>

            <p className="gm-muted mt-4 text-sm">
              No credit card required · Cancel any time · Your data stays yours
            </p>
          </div>

          {/* Snapshot tiles */}
          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { label: "Tracked this month", value: "$4,820", tone: "text-brand-600" },
              { label: "Left to spend", value: "$1,145", tone: "" },
              { label: "Saved toward goals", value: "$12,400", tone: "text-brand-600" },
            ].map((tile) => (
              <div key={tile.label} className="gm-card text-center">
                <p className="gm-muted text-xs font-semibold uppercase tracking-wide">
                  {tile.label}
                </p>
                <p className={`mt-2 text-3xl font-black ${tile.tone}`}>{tile.value}</p>
              </div>
            ))}
          </div>
          <p className="gm-muted mt-3 text-center text-xs">
            Illustrative figures. Your dashboard shows your own numbers.
          </p>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-[var(--gm-border)] py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">
              Everything you need to run your money
            </h2>
            <p className="gm-muted mx-auto mt-3 max-w-2xl text-center">
              No spreadsheets. No guesswork. No overseas currency conversions.
            </p>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="gm-card">
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="gm-muted mt-2 text-sm leading-relaxed">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-center text-3xl font-black tracking-tight">
              Your money data, handled properly
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[
                {
                  title: "We never hold your bank logins",
                  body: "Genevieve App does not screen-scrape or store banking credentials. You stay in control by importing statements yourself.",
                },
                {
                  title: "Encrypted in transit and at rest",
                  body: "Served over HTTPS on Cloudflare's global network, with data stored in an encrypted Neon Postgres database.",
                },
                {
                  title: "Payments handled by Stripe",
                  body: "Card details go straight to Stripe, a PCI DSS Level 1 provider. Genevieve App never sees or stores your card number.",
                },
                {
                  title: "Export or delete any time",
                  body: "Your records are yours. Export everything to CSV, or delete your account and we remove your data.",
                },
              ].map((item) => (
                <div key={item.title} className="gm-card">
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="gm-muted mt-2 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-4">
            <div className="gm-card bg-brand-600 text-center text-white">
              <h2 className="text-3xl font-black tracking-tight">
                Take control of every dollar
              </h2>
              <p className="mt-3 text-brand-50">
                Start free today. Upgrade when you are ready — from $9.99 a month.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="gm-btn w-full bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50 sm:w-auto"
                >
                  Start Free
                </Link>
                <Link
                  href="/pricing"
                  className="gm-btn w-full border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10 sm:w-auto"
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
