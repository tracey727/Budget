import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PricingTable } from "@/components/marketing/PricingTable";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Genevieve App pricing in AUD. Starter is free. Personal Premium $9.99/month or $99/year. Professional $19.99/month or $199/year. Founding member pricing available at launch.",
};

const COMPARISON: Array<{ label: string; starter: string; personal: string; professional: string }> = [
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
    q: "Is Genevieve App financial advice?",
    a: "No. Genevieve App is a budgeting and record-keeping tool. It does not provide financial product advice or take your personal circumstances into account.",
  },
];

export default async function PricingPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(user)} />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h1 className="gm-display text-4xl font-semibold sm:text-5xl">
              Simple pricing, in Australian dollars
            </h1>
            <p className="gm-muted mt-4 text-lg">
              Start free. No credit card required. Save with an annual
              membership. No GST added — the price you see is the price you pay.
            </p>
          </div>

          {/* Launch promotion — rendered server-side so it is visible on load
              (and to search engines), not only after toggling to Annual. */}
          <div className="mx-auto mb-10 max-w-3xl rounded-xl border border-brand-500/40 bg-brand-500/10 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Launch promotion — founding members
            </p>
            <p className="mt-2 text-lg font-black">
              Personal Premium $69 for your first year ·{" "}
              <span className="whitespace-nowrap">Professional $139 for your first year</span>
            </p>
            <p className="gm-muted mt-1.5 text-sm">
              Choose <strong>Annual</strong> below to claim founding pricing. Renews at the
              standard annual rate ($99 or $199) after the first year. Cancel any time.
            </p>
            <p className="gm-muted mt-2 text-xs">
              <Link href="/subscriptions" className="underline hover:text-brand-600">
                Read how founding renewal works
              </Link>
            </p>
          </div>

          <PricingTable signedIn={Boolean(user)} />

          {/* Full comparison */}
          <div className="mt-20">
            <h2 className="gm-display mb-6 text-center text-3xl font-semibold">
              Compare every plan
            </h2>
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
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="gm-display mb-6 text-center text-3xl font-semibold">
              Questions, answered
            </h2>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <details key={item.q} className="gm-card">
                  <summary className="cursor-pointer list-none font-semibold">
                    {item.q}
                  </summary>
                  <p className="gm-muted mt-2.5 text-sm leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
