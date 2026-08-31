import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/LegalPage";
import { getSessionUser } from "@/lib/auth/session";
import { BUSINESS, taxNote } from "@/lib/business";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Subscription & Refund Policy",
  description:
    "Recurring charges, renewal, founding member pricing, cancellation, failed payments and refunds for Gen Money.",
};

export default async function SubscriptionPolicyPage() {
  const user = await getSessionUser().catch(() => null);
  const personal = PLANS.personal;
  const professional = PLANS.professional;

  return (
    <LegalPage
      title="Subscription & Refund Policy"
      updated={BUSINESS.legalUpdated}
      signedIn={Boolean(user)}
    >
      <p>
        This policy forms part of our{" "}
        <Link href="/terms" className="font-semibold text-brand-600 hover:underline">
          Terms of Use
        </Link>{" "}
        and applies to paid {BUSINESS.appName} subscriptions.
        {" "}{BUSINESS.appName} is {BUSINESS.appDescriptor} — a budgeting tool
        for people who travel.
      </p>

      <h2>1. Clear recurring price before purchase</h2>
      <p>
        Before a subscription can be purchased, {BUSINESS.appName} displays the
        recurring price in Australian dollars, the billing period, and that the
        subscription renews automatically until cancelled. The total price
        payable is clear before you commit to payment. We do not use hidden
        pre-selected paid extras.
      </p>

      <h2>2. Current plans and prices</h2>
      <div className="gm-scroll-x">
        <table className="gm-table min-w-[520px]">
          <thead>
            <tr>
              <th scope="col">Plan</th>
              <th scope="col">Monthly</th>
              <th scope="col">Annual</th>
              <th scope="col">Founding (first year)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-semibold">Starter</td>
              <td>Free</td>
              <td>Free</td>
              <td>—</td>
            </tr>
            <tr>
              <td className="font-semibold">{personal.name}</td>
              <td>{personal.monthly?.label} AUD</td>
              <td>{personal.annual?.label} AUD</td>
              <td>$69 AUD</td>
            </tr>
            <tr>
              <td className="font-semibold">{professional.name}</td>
              <td>{professional.monthly?.label} AUD</td>
              <td>{professional.annual?.label} AUD</td>
              <td>$139 AUD</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The Starter plan is free and does not require payment details. There is
        no minimum commitment on any plan beyond the billing period you select.
      </p>

      <h2>3. Founding member pricing — how renewal works</h2>
      <p>
        <strong>
          Founding member pricing is a launch promotion that applies to your
          first year only.
        </strong>{" "}
        If you subscribe on a founding offer:
      </p>
      <ul>
        <li>
          You pay <strong>$69 AUD</strong> for your first year of{" "}
          {personal.name}, or <strong>$139 AUD</strong> for your first year of{" "}
          {professional.name}.
        </li>
        <li>
          At the end of that first year the subscription{" "}
          <strong>renews automatically at the standard annual rate</strong> —{" "}
          <strong>{personal.annual?.label} AUD</strong> per year for{" "}
          {personal.name}, or <strong>{professional.annual?.label} AUD</strong>{" "}
          per year for {professional.name} — unless you cancel before the renewal
          date.
        </li>
        <li>
          You can cancel at any time during the first year and keep access until
          the end of the year you have paid for.
        </li>
      </ul>
      <p>
        This step-up is disclosed on the pricing page, at checkout and here
        before you pay. We will not apply an undisclosed increase.
      </p>

      <h2>4. How payment works</h2>
      <p>
        Subscription checkout is hosted by Stripe. {BUSINESS.appName} does not
        store your full card number in its application database. Stripe may
        create a customer and subscription record and provide{" "}
        {BUSINESS.appName} with identifiers, payment status, billing email and
        subscription information needed to provide your plan.
      </p>

      <h2>5. Automatic renewal</h2>
      <p>
        Your subscription renews at the billing interval shown at checkout until
        you cancel it. We do not treat a one-off payment as permission to start a
        different undisclosed recurring charge.
      </p>

      <h2>6. Cancelling</h2>
      <p>
        You can cancel at any time from the Billing page in the app, which opens
        the Stripe Customer Portal. There is no cancellation fee and no phone
        call is required. Unless a different remedy is required by law,
        cancellation stops the next renewal and your access continues until the
        end of the period you have already paid for.
      </p>
      <p>
        When a paid subscription ends, your account reverts to the free Starter
        plan. <strong>Your records are not deleted.</strong> Paid features such
        as CSV import, reports and business tools switch off, and Starter plan
        limits apply to new data.
      </p>

      <p className="gm-muted text-sm">
        Cancelling needs an internet connection, so if you are heading somewhere
        without coverage and intend to cancel before a renewal date, do it before
        you leave rather than relying on getting online along the way.
      </p>

      <h2>7. Changing plans</h2>
      <p>
        You can upgrade, downgrade, or switch between monthly and annual billing
        at any time from the Billing page. Stripe prorates the change. A price
        difference is charged or credited according to the time remaining in your
        current period.
      </p>

      <h2>8. Price changes</h2>
      <p>
        A price increase will not be applied retrospectively to a period already
        paid for. If a future renewal price changes, we will provide reasonable
        notice before the new price takes effect so that you can decide whether
        to continue or cancel.
      </p>

      <h2>9. Failed payments</h2>
      <p>
        Stripe may retry a failed recurring payment and may ask you to update
        your payment method. If recovery is unsuccessful, paid features may be
        suspended and your account reverts to the Starter plan. Your data
        remains available to you.
      </p>

      <h2>10. Refunds and Australian Consumer Law</h2>
      <p>
        We do not use a blanket &ldquo;no refunds&rdquo; rule. Your rights under
        the Australian Consumer Law cannot be excluded. If a service has a major
        failure or otherwise does not meet a non-excludable consumer guarantee,
        you may be entitled to cancel and receive a refund for an unused portion,
        compensation for reduced value, or another remedy depending on the
        circumstances.
      </p>
      <p>
        For a change-of-mind cancellation where the service has been supplied as
        promised, an automatic pro-rata refund is not promised unless required by
        law or expressly stated at the time of purchase. You may still contact us
        and we will consider the circumstances.
      </p>

      <h2>11. Taxes and receipts</h2>
      <p>
        {taxNote()} There are no unavoidable extra charges added at checkout, and
        the amount you agree to is the amount Stripe charges. Stripe provides
        payment records and receipts as part of the payment flow.
      </p>
      <p className="gm-muted text-xs">
        If our GST registration status changes in future, prices will be updated
        and any change will be notified in advance under clause 8.
      </p>

      <h2>12. Contact about billing</h2>
      <p>
        Email{" "}
        <a
          href={`mailto:${BUSINESS.billingEmail}`}
          className="font-semibold text-brand-600 hover:underline"
        >
          {BUSINESS.billingEmail}
        </a>
        . Please include enough information for us to identify the subscription,
        but do not send full card numbers or security codes by email.
      </p>
    </LegalPage>
  );
}
