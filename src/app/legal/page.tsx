import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getSessionUser } from "@/lib/auth/session";
import { BUSINESS, COMPANY, PAYMENTS, PRODUCTS, companyEntityLine } from "@/lib/business";
import { OnTrackLockup } from "@/components/OnTrackLogo";
import { PaymentDetails } from "@/components/PaymentDetails";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "ON TRACK Budget Rescue legal information: Terms of Use, Subscription & Refund Policy and Privacy Policy.",
};

const DOCUMENTS = [
  {
    href: "/terms",
    title: "Terms of Use",
    body: "How the app can be used, what it is and is not, third-party services and your Australian consumer rights.",
  },
  {
    href: "/subscriptions",
    title: "Subscription & Refund Policy",
    body: "Recurring charges, automatic renewal, how founding member pricing steps up after the first year, cancellation, failed payments and refunds.",
  },
  {
    href: "/privacy",
    title: "Privacy Policy",
    body: "What information is collected, why, where it goes, how it is secured and how to contact us.",
  },
];

export default async function LegalIndexPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader signedIn={Boolean(user)} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Legal</h1>
        <p className="gm-muted mt-3">
          Clear rules, not fine-print traps. Every document below is linked
          before you are asked to pay.
        </p>

        <div className="mt-8 space-y-4">
          {DOCUMENTS.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="gm-card block transition hover:border-brand-400"
            >
              <h2 className="font-bold text-brand-600">{doc.title}</h2>
              <p className="gm-muted mt-1.5 text-sm leading-relaxed">{doc.body}</p>
            </Link>
          ))}
        </div>

        <PaymentDetails className="mt-8" />

        <div className="gm-card mt-8">
          <h2 className="font-bold">Who you are dealing with</h2>

          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
            <OnTrackLockup width={148} className="shrink-0 self-start" />
            <div className="gm-muted text-sm leading-relaxed">
              <p className="font-semibold text-[var(--cream)]">{COMPANY.name}</p>
              <p className="italic">{COMPANY.tagline}</p>
              <p className="mt-2">
                {PRODUCTS.budget.name} and {PRODUCTS.rescue.name}™ are published
                under the {COMPANY.name} brand and operated by the same
                Australian business.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(0,11rem)_1fr]">
            <dt className="gm-muted">Operator</dt>
            <dd className="font-medium">{BUSINESS.operator}</dd>

            <dt className="gm-muted">Trading as</dt>
            <dd className="font-medium">
              {COMPANY.registeredBusinessName
                ? COMPANY.name
                : `Not yet registered — operating as ${BUSINESS.operator}`}
            </dd>

            <dt className="gm-muted">ABN</dt>
            <dd className="font-mono font-medium">{BUSINESS.abn}</dd>

            <dt className="gm-muted">GST</dt>
            <dd className="font-medium">
              {BUSINESS.gstRegistered
                ? "Registered for GST"
                : "Not registered for GST — no GST is charged on subscriptions"}
            </dd>

            <dt className="gm-muted">Postal address</dt>
            <dd className="font-medium">{BUSINESS.postalAddress}</dd>

            <dt className="gm-muted">Contact</dt>
            <dd className="font-medium">
              <a
                href={`mailto:${BUSINESS.supportEmail}`}
                className="text-brand-600 hover:underline"
              >
                {BUSINESS.supportEmail}
              </a>
            </dd>

            <dt className="gm-muted">Payments taken by</dt>
            <dd className="font-medium">
              {PAYMENTS.processor} ({PAYMENTS.processorEntity}) on behalf of{" "}
              {BUSINESS.operator}
            </dd>

            <dt className="gm-muted">Governing law</dt>
            <dd className="font-medium">{BUSINESS.jurisdiction}</dd>
          </dl>

          <p className="gm-muted mt-5 text-xs leading-relaxed">
            Your contract for {PRODUCTS.budget.name} and for{" "}
            {PRODUCTS.rescue.name}™ is with {companyEntityLine()} — one
            operator, one ABN, behind both products. The Australian Consumer
            Law guarantees that apply to these services cannot be excluded.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
