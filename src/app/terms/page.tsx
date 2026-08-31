import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use Gen Money.",
};

export default async function TermsPage() {
  const user = await getSessionUser().catch(() => null);

  return (
    <LegalPage title="Terms of Service" updated="31 August 2026" signedIn={Boolean(user)}>
      <p>
        These terms apply to your use of Gen Money. By creating an account you
        agree to them. If you do not agree, please do not use the service.
      </p>

      <h2>1. What Gen Money is</h2>
      <p>
        Gen Money is a budgeting and record-keeping tool. It helps you record
        transactions, set budgets, track bills and monitor savings goals.
      </p>
      <p>
        <strong>Gen Money is not financial product advice.</strong> Nothing in
        the service takes your objectives, financial situation or needs into
        account. It is not tax advice, credit assistance, or a recommendation to
        acquire or dispose of any financial product. Consider seeking advice from
        a licensed financial adviser or registered tax agent before acting on
        anything you see here.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>You are responsible for keeping your password secure.</li>
        <li>You are responsible for the accuracy of the data you enter.</li>
        <li>One account per person. Do not share your login.</li>
      </ul>

      <h2>3. Plans and payment</h2>
      <ul>
        <li>The Starter plan is free and does not require payment details.</li>
        <li>
          Paid plans are billed in advance in Australian dollars: Personal
          Premium at $9.99 per month or $99 per year, and Professional at $19.99
          per month or $199 per year.
        </li>
        <li>
          Founding member pricing ($69 for Personal Premium, $139 for
          Professional) applies to the first year only. After that first year the
          subscription renews at the standard annual rate unless you cancel.
        </li>
        <li>
          Subscriptions renew automatically until cancelled. You can cancel at
          any time; access continues to the end of the period you have paid for.
        </li>
        <li>Payments are processed by Stripe. We do not store your card details.</li>
        <li>Prices include GST where applicable. We may change prices with at least 30 days&rsquo; notice.</li>
      </ul>

      <h2>4. Refunds and your consumer rights</h2>
      <p>
        Nothing in these terms excludes, restricts or modifies any guarantee,
        right or remedy you have under the Australian Consumer Law that cannot
        be excluded. If the service is faulty or not as described, you may be
        entitled to a repair, replacement or refund.
      </p>
      <p>
        Outside of those rights, subscription fees already paid are generally
        non-refundable, though we will consider reasonable requests — contact us.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to gain unauthorised access to the service or other users&apos; data.</li>
        <li>Use the service to break any law.</li>
        <li>Resell, scrape or redistribute the service without our written consent.</li>
        <li>Interfere with the service&apos;s normal operation or place unreasonable load on it.</li>
      </ul>

      <h2>6. Availability</h2>
      <p>
        We aim to keep Gen Money available at all times, but we do not guarantee
        uninterrupted access. We may suspend the service for maintenance,
        security or technical reasons.
      </p>

      <h2>7. Your data</h2>
      <p>
        You own the data you put into Gen Money. You can export it to CSV at any
        time on a paid plan, and you can delete your account. Our handling of
        personal information is described in our Privacy Policy.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the extent permitted by law, and subject to your rights under the
        Australian Consumer Law, our total liability arising out of your use of
        Gen Money is limited to the amount you paid us in the 12 months before
        the claim. We are not liable for indirect or consequential loss,
        including lost profits or lost data, arising from decisions you make
        using the service.
      </p>

      <h2>9. Ending your account</h2>
      <p>
        You can close your account at any time. We may suspend or close an
        account that breaches these terms, and will tell you why where we can.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. If a change is material we will give notice in
        the app or by email before it takes effect.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of Australia and the state in which
        Gen Money is operated, and you submit to the non-exclusive jurisdiction
        of the courts of that state.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms can be sent through the contact page.
      </p>
    </LegalPage>
  );
}
