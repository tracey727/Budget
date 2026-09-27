import Link from "next/link";
import { Logo, TrademarkNote } from "@/components/Logo";
import { OnTrackLogo } from "@/components/OnTrackLogo";
import {
  BUSINESS,
  COMPANY,
  PAYMENTS,
  PRODUCTS,
  companyEntityLine,
  taxNote,
} from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="py-12"
      style={{ borderTop: "1px solid var(--gold-line)" }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo size="sm" />
            <p className="gm-muted mt-3 text-sm">
              Take control of every dollar. Built in Australia, priced in
              Australian dollars, for Australian households and sole traders.
            </p>

            <div className="mt-6">
              <p className="gm-muted mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
                A product of
              </p>
              <OnTrackLogo size="sm" showTagline />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <h3 className="mb-2 font-semibold">Product</h3>
              <ul className="gm-muted space-y-1.5">
                <li><Link href="/pricing" className="hover:text-brand-600">Pricing</Link></li>
                <li><Link href="/#features" className="hover:text-brand-600">Features</Link></li>
                <li><Link href="/signup" className="hover:text-brand-600">Start free</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Company</h3>
              <ul className="gm-muted space-y-1.5">
                <li><Link href="/contact" className="hover:text-brand-600">Contact</Link></li>
                <li><Link href="/#security" className="hover:text-brand-600">Security</Link></li>
                <li>
                  <Link href={PRODUCTS.rescue.href} className="hover:text-brand-600">
                    {PRODUCTS.rescue.name}™
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Legal</h3>
              <ul className="gm-muted space-y-1.5">
                <li><Link href="/terms" className="hover:text-brand-600">Terms of Use</Link></li>
                <li><Link href="/subscriptions" className="hover:text-brand-600">Subscription &amp; Refunds</Link></li>
                <li><Link href="/privacy" className="hover:text-brand-600">Privacy</Link></li>
                <li><Link href="/legal" className="hover:text-brand-600">All legal</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="gm-muted mt-9 pt-7 text-xs leading-relaxed"
          style={{ borderTop: "1px solid var(--gold-line-soft)" }}>
          <div className="mb-3">
            <TrademarkNote />
          </div>
          <p>
            © {new Date().getFullYear()} {companyEntityLine()}.{" "}
            {BUSINESS.postalAddress}
          </p>
          <p className="mt-1.5">
            {taxNote()} Payments are processed by {PAYMENTS.processor} (
            {PAYMENTS.processorEntity}) on behalf of {BUSINESS.operator}; card
            details are entered on {PAYMENTS.processor}&rsquo;s hosted checkout
            and are never stored on our servers. Charges appear on your
            statement as{" "}
            <span className="font-mono">{PAYMENTS.statementDescriptor}</span>.
            Subscriptions renew automatically until cancelled — see the{" "}
            <Link href="/subscriptions" className="underline hover:text-brand-600">
              Subscription &amp; Refund Policy
            </Link>
            .
          </p>
          <p className="mt-2">
            {PRODUCTS.budget.name} and {PRODUCTS.rescue.name}™ are published
            under the {COMPANY.name} brand and operated by the same Australian
            business.
          </p>
          <p className="mt-2">
            {BUSINESS.appName} provides budgeting and record-keeping tools only.
            It is not financial product advice and does not take your
            objectives, financial situation or needs into account. GST and
            financial-year summaries are record-keeping aids, not a lodged BAS.
            Consider obtaining advice from a licensed financial adviser or
            registered tax agent before making financial decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
