import Link from "next/link";
import { OnTrackLogo, OnTrackTrademarkNote } from "@/components/OnTrackLogo";
import {
  BUSINESS,
  COMPANY,
  PAYMENTS,
  PRODUCTS,
  companyEntityLine,
  taxNote,
} from "@/lib/business";

/**
 * The legal footer that sits under the signed-in products.
 *
 * Everything a customer is entitled to find without hunting is here: who they
 * are dealing with, the ABN, where to write, who takes the money, what shows
 * on their statement, the tax position, and the policies — one component so
 * the budget app and Revenue Rescue can never drift apart.
 */

const DISCLAIMER: Record<"budget" | "rescue", string> = {
  budget:
    `${BUSINESS.appName} provides budgeting and record-keeping tools only. It is not financial ` +
    "product advice and does not take your objectives, financial situation or needs into " +
    "account. GST and financial-year summaries are record-keeping aids, not a lodged BAS. " +
    "Consider obtaining advice from a licensed financial adviser or registered tax agent " +
    "before making financial decisions.",
  rescue:
    `${PRODUCTS.rescue.name}™ finds and prioritises preventable leakage. It never charges, ` +
    "refunds, writes off or posts anything on your behalf — every finding is reviewed by a " +
    "person. It is not financial, tax, legal or clinical advice.",
};

const LINKS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/subscriptions", label: "Subscription & Refunds" },
  { href: "/privacy", label: "Privacy" },
  { href: "/legal", label: "All legal" },
  { href: "/contact", label: "Contact" },
];

export function LegalFooter({ product }: { product: "budget" | "rescue" }) {
  return (
    <footer
      className="mt-10 py-9"
      style={{ borderTop: "1px solid var(--gold-line)" }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <OnTrackLogo size="sm" showTagline />
            <p className="gm-muted mt-3 text-xs leading-relaxed">
              {PRODUCTS.budget.name} and {PRODUCTS.rescue.name}™ are products of{" "}
              {COMPANY.name}.
            </p>
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="gm-muted hover:text-brand-600">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="gm-muted mt-7 space-y-2 pt-6 text-[11px] leading-relaxed"
          style={{ borderTop: "1px solid var(--gold-line-soft)" }}
        >
          <OnTrackTrademarkNote />

          <p>
            © {new Date().getFullYear()} {companyEntityLine()}.{" "}
            {BUSINESS.postalAddress}.{" "}
            <a
              href={`mailto:${BUSINESS.supportEmail}`}
              className="underline hover:text-brand-600"
            >
              {BUSINESS.supportEmail}
            </a>
          </p>

          <p>
            {taxNote()} Payments are processed by {PAYMENTS.processor} (
            {PAYMENTS.processorEntity}); card details are entered on{" "}
            {PAYMENTS.processor}&rsquo;s hosted checkout and are never stored on
            our servers. Charges appear on your statement as{" "}
            <span className="font-mono">{PAYMENTS.statementDescriptor}</span>.
            Subscriptions renew automatically until cancelled — see the{" "}
            <Link href="/subscriptions" className="underline hover:text-brand-600">
              Subscription &amp; Refund Policy
            </Link>
            .
          </p>

          <p>{DISCLAIMER[product]}</p>
        </div>
      </div>
    </footer>
  );
}
