import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";
import { getSessionUser } from "@/lib/auth/session";
import { BUSINESS, legalEntityLine, taxNote } from "@/lib/business";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use Genevieve App.",
};

export default async function TermsPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <LegalPage
      title="Terms of Use"
      updated={BUSINESS.legalUpdated}
      signedIn={Boolean(user)}
    >
      <p>
        These Terms apply to the {BUSINESS.appName} web application operated by{" "}
        {legalEntityLine()}, {BUSINESS.postalAddress} (&ldquo;{BUSINESS.appName}
        &rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;).
      </p>

      <h2>1. What the app does</h2>
      <p>
        {BUSINESS.appName} provides budgeting, expense tracking, savings-goal and
        record-keeping tools. Budgets, category summaries, cash-flow charts,
        goal projections and GST or financial-year summaries are
        decision-support information generated from the data you enter.
      </p>
      <p>
        <strong>
          {BUSINESS.appName} is not financial product advice, credit assistance
          or tax advice.
        </strong>{" "}
        Nothing in the app takes your objectives, financial situation or needs
        into account, and no output is a recommendation to acquire or dispose of
        any financial product. GST and financial-year summaries are
        record-keeping aids prepared from your own entries — they are not a
        lodged Business Activity Statement and are not a substitute for a
        registered tax agent. Your bank, lender, accountant and the Australian
        Taxation Office remain the authoritative source for your actual
        position.
      </p>

      <h2>2. Your responsibilities</h2>
      <ul>
        <li>Use the app lawfully.</li>
        <li>
          Keep your password secure and do not share your account with anyone
          else.
        </li>
        <li>
          Check the accuracy of what you enter or import. The app can only be as
          correct as the data you give it.
        </li>
        <li>
          Verify anything important against your actual bank statements before
          relying on it, particularly before lodging anything with the ATO.
        </li>
      </ul>

      <h2>3. Your account</h2>
      <p>
        You must be at least 18 years old to create an account. One account per
        person. You are responsible for activity that occurs under your login.
        If you forget your password you can reset it by email from the log-in
        page. Tell us promptly if you believe your account has been accessed
        without your authority.
      </p>

      <h2>4. Third-party services</h2>
      <p>
        The app relies on third-party services including Stripe for payments,
        Cloudflare for application hosting, Neon for database hosting and an
        email provider for account emails such as password resets. Those
        services operate under their own terms and privacy practices. Their
        availability is not something we control.
      </p>

      <h2>5. Subscriptions and payments</h2>
      <p>
        The Starter plan is free and does not require payment details. Paid
        plans are billed in advance in Australian dollars. Before you pay, the
        recurring price, the billing period and the fact that the subscription
        renews automatically until cancelled are displayed to you.
      </p>
      <p>
        Founding member pricing is a launch promotion that applies to the first
        year only. After the first year the subscription renews at the standard
        annual rate unless you cancel. This is set out in full in our{" "}
        <Link href="/subscriptions" className="font-semibold text-brand-600 hover:underline">
          Subscription &amp; Refund Policy
        </Link>
        , which forms part of these Terms.
      </p>
      <p>
        {taxNote()} Stripe processes subscription payments. We do not store your
        card number.
      </p>

      <h2>6. Australian Consumer Law</h2>
      <p>
        Nothing in these Terms excludes, restricts or modifies any consumer
        guarantee, right or remedy that cannot lawfully be excluded under the
        Australian Consumer Law or other applicable law. If the service fails to
        meet a non-excludable consumer guarantee, you may have rights to a
        remedy including cancellation, refund or compensation depending on the
        circumstances.
      </p>

      <h2>7. Availability and changes</h2>
      <p>
        We may maintain, improve or change the app. We will not use these Terms
        to remove non-excludable consumer rights. A material adverse change to a
        paid subscription will be applied prospectively and, where appropriate,
        with reasonable notice and an opportunity to cancel before the change
        takes effect.
      </p>
      <p>
        We aim to keep {BUSINESS.appName} available at all times but do not
        guarantee uninterrupted access. We may suspend the service for
        maintenance, security or technical reasons.
      </p>

      <h2>8. Acceptable use</h2>
      <p>
        You must not interfere with the app, probe or bypass security controls,
        use another person&rsquo;s account without authority, automate abusive
        requests, submit unlawful material, or attempt to obtain data that is
        not yours. We may restrict access where reasonably necessary to protect
        users, the service or legal rights.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        {BUSINESS.appName} names, branding, app design, original software and
        original content are owned by or licensed to the operator. These Terms
        give you a personal, revocable right to use the service; they do not
        transfer ownership of intellectual property.
      </p>
      <p>
        You own the financial records you enter. You grant us only the licence
        needed to store, process and display that data back to you in order to
        operate the service.
      </p>

      <h2>10. Your data</h2>
      <p>
        You can export your records to CSV on a paid plan, and you can delete
        your account at any time. If you cancel a paid subscription your account
        reverts to the free Starter plan — your records are not deleted. Our
        handling of personal information is described in the{" "}
        <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>11. Liability</h2>
      <p>
        To the maximum extent permitted by law, {BUSINESS.appName} is not
        responsible for loss caused solely by inaccurate data you or a third
        party entered or imported, a financial or tax decision you made using
        the app&rsquo;s summaries without independent verification, device or
        network failure, or circumstances outside our reasonable control. This
        clause does not exclude liability or remedies that cannot lawfully be
        excluded.
      </p>
      <p>
        Where liability can lawfully be limited, our total liability arising out
        of your use of {BUSINESS.appName} is limited to the amount you paid us in
        the 12 months before the claim.
      </p>

      <h2>12. Ending your account</h2>
      <p>
        You can close your account at any time. We may suspend or close an
        account that breaches these Terms, and will tell you why where we
        reasonably can.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws applying in {BUSINESS.jurisdiction},
        subject to any mandatory rights or jurisdiction that applies to you.
      </p>

      <h2>14. Contact</h2>
      <p>
        Email{" "}
        <a
          href={`mailto:${BUSINESS.supportEmail}`}
          className="font-semibold text-brand-600 hover:underline"
        >
          {BUSINESS.supportEmail}
        </a>{" "}
        or write to {BUSINESS.postalAddress}.
      </p>
    </LegalPage>
  );
}
