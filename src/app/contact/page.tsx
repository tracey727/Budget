import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";
import { getSessionUser } from "@/lib/auth/session";
import { BUSINESS, legalEntityLine } from "@/lib/business";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Genevieve App team.",
};

export default async function ContactPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <LegalPage
      title="Contact"
      updated={BUSINESS.legalUpdated}
      signedIn={Boolean(user)}
    >
      <p>
        We read everything that comes in and aim to reply within two business
        days. Professional plan subscribers get priority support.
      </p>

      <h2>Email</h2>
      <p>
        For help with your account, billing, privacy requests, or anything that
        is not working as it should:
      </p>
      <p>
        <a
          href={`mailto:${BUSINESS.supportEmail}`}
          className="text-lg font-bold text-brand-600 hover:underline"
        >
          {BUSINESS.supportEmail}
        </a>
      </p>
      <p className="gm-muted text-xs">
        Please do not send full card numbers or security codes by email.
      </p>

      <h2>Post</h2>
      <p>
        {legalEntityLine()}
        <br />
        {BUSINESS.postalAddress}
      </p>

      <h2>Before you write in</h2>
      <p>
        Many questions are already answered on the{" "}
        <Link href="/pricing" className="font-semibold text-brand-600 hover:underline">
          pricing page
        </Link>{" "}
        and in the{" "}
        <Link href="/subscriptions" className="font-semibold text-brand-600 hover:underline">
          Subscription &amp; Refund Policy
        </Link>
        , including how founding pricing renews after the first year, how to
        change or cancel a plan, and what happens to your data if you cancel.
      </p>
    </LegalPage>
  );
}
