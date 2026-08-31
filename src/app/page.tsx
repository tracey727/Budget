import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    title: "A budget for every trip",
    body: "Give each journey its own budget and dates. Watch what is left, and what that leaves you per day for the rest of the run.",
  },
  {
    title: "Fuel and park fees, tracked",
    body: "Diesel, caravan parks, national park permits, tolls and dump points — categories already set up the way travellers actually spend.",
  },
  {
    title: "Home costs keep running",
    body: "Rates, insurance, storage and the mortgage do not stop when you leave. Track them beside your travel spend, not in a separate spreadsheet.",
  },
  {
    title: "Import your bank statements",
    body: "Drop in a CSV from any Australian bank. Gen Money maps the columns, skips duplicates and files everything by category.",
  },
  {
    title: "Bills before they bite",
    body: "Rego, insurance and roadside cover on weekly, quarterly or annual cycles. See what falls due in the next fortnight before it lands.",
  },
  {
    title: "Sole trader ready",
    body: "Working as you travel? Split business from personal, tag deductible spend, and track GST across the Australian financial year.",
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
              The travellers budget · Built for Australia
            </p>
            <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              GEN MONEY — Take Control of{" "}
              <span className="text-brand-600">Every Dollar</span>
            </h1>
            <p className="gm-muted mx-auto mt-5 max-w-2xl text-pretty text-lg">
              Know what the trip is costing while you are still on it. Fuel,
              parks, food and the bills back home — all in one place, in
              Australian dollars. Start free. No credit card required.
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
              { label: "Trip budget", value: "$4,500", tone: "" },
              { label: "Spent so far", value: "$3,355", tone: "" },
              { label: "Left · 12 days", value: "$95/day", tone: "text-brand-600" },
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
              Everything you need to run the money on the road
            </h2>
            <p className="gm-muted mx-auto mt-3 max-w-2xl text-center">
              No spreadsheets at the campsite. No guesswork at the bowser. No
              overseas currency conversions.
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
                  title: "We never track where you are",
                  body: "No GPS, no route history, no location stored — ever. A trip is just the name, dates and budget you type in yourself.",
                },
                {
                  title: "We never hold your bank logins",
                  body: "Gen Money does not screen-scrape or store banking credentials. You stay in control by importing statements yourself.",
                },
                {
                  title: "Encrypted in transit and at rest",
                  body: "Served over HTTPS on Cloudflare's global network, with data stored in an encrypted Neon Postgres database.",
                },
                {
                  title: "Payments handled by Stripe",
                  body: "Card details go straight to Stripe, a PCI DSS Level 1 provider. Gen Money never sees or stores your card number.",
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
                Start free today. Upgrade when you are ready — from $9.99 a month,
                in Australian dollars, no GST added.
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
