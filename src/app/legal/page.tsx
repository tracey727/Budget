import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getSessionUser } from "@/lib/auth/session";
import { BUSINESS, legalEntityLine } from "@/lib/business";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "Gen Money legal information: Terms of Use, Subscription & Refund Policy and Privacy Policy.",
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

        <div className="gm-card mt-8">
          <h2 className="font-bold">Who operates {BUSINESS.appName}</h2>
          <p className="gm-muted mt-2 text-sm leading-relaxed">
            {legalEntityLine()}
            <br />
            {BUSINESS.postalAddress}
            <br />
            <a
              href={`mailto:${BUSINESS.supportEmail}`}
              className="text-brand-600 hover:underline"
            >
              {BUSINESS.supportEmail}
            </a>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
