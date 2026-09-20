import Link from "next/link";
import { BUSINESS, PAYMENTS, taxNote } from "@/lib/business";

/**
 * Who takes the money, and how.
 *
 * Shown wherever a payment can be started so the merchant, the processor,
 * the currency, the tax position and the statement descriptor are all visible
 * before a card is entered rather than discovered afterwards.
 */
export function PaymentDetails({ className = "" }: { className?: string }) {
  const rows: Array<{ term: string; value: React.ReactNode }> = [
    {
      term: "Payments processed by",
      value: (
        <>
          {PAYMENTS.processor} ({PAYMENTS.processorEntity}) —{" "}
          <a
            href={PAYMENTS.processorPrivacyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline hover:text-brand-600"
          >
            Stripe privacy policy
          </a>
        </>
      ),
    },
    { term: "Charged by (merchant)", value: PAYMENTS.merchantOfRecord },
    {
      term: "Shows on your statement as",
      value: <span className="font-mono">{PAYMENTS.statementDescriptor}</span>,
    },
    { term: "Currency", value: PAYMENTS.currencyLabel },
    { term: "Accepted", value: PAYMENTS.methods.join(", ") },
    {
      term: "Billing enquiries",
      value: (
        <a
          href={`mailto:${BUSINESS.billingEmail}`}
          className="underline hover:text-brand-600"
        >
          {BUSINESS.billingEmail}
        </a>
      ),
    },
  ];

  return (
    <section className={`gm-card ${className}`} aria-labelledby="payment-details">
      <h2 id="payment-details" className="gm-display text-xl font-semibold">
        Payments and security
      </h2>

      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[minmax(0,13rem)_1fr]">
        {rows.map((row) => (
          <div key={row.term} className="contents">
            <dt className="gm-muted">{row.term}</dt>
            <dd className="font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="gm-muted mt-5 text-xs leading-relaxed">
        {taxNote()} Checkout and subscription management run on{" "}
        {PAYMENTS.checkout} and the {PAYMENTS.portal}, both hosted by{" "}
        {PAYMENTS.processor}. Your full card number never reaches our servers
        and is never stored in this application&rsquo;s database — we hold only
        the {PAYMENTS.processor} customer and subscription identifiers, the
        plan, the status and the renewal date needed to run your account.
        Cancel at any time from the billing portal; your access runs to the end
        of the period you have paid for. Refunds and your non-excludable
        Australian Consumer Law rights are set out in the{" "}
        <Link href="/subscriptions" className="underline hover:text-brand-600">
          Subscription &amp; Refund Policy
        </Link>
        . Please never send full card numbers or security codes by email.
      </p>
    </section>
  );
}
