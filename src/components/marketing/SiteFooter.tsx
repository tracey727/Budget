import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BUSINESS, legalEntityLine } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--gm-border)] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="gm-muted mt-3 text-sm">
              Take control of every dollar. Built in Australia, priced in
              Australian dollars, for Australian households and sole traders.
            </p>
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

        <div className="gm-muted mt-8 border-t border-[var(--gm-border)] pt-6 text-xs leading-relaxed">
          <p>
            © {new Date().getFullYear()} {legalEntityLine()}.{" "}
            {BUSINESS.postalAddress}
          </p>
          <p className="mt-1.5">
            All prices in AUD and include GST where applicable. Subscriptions
            renew automatically until cancelled — see the{" "}
            <Link href="/subscriptions" className="underline hover:text-brand-600">
              Subscription &amp; Refund Policy
            </Link>
            .
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
