# GST position

**Genevieve App is not registered for GST.** Turnover is well below the
$75,000 ATO registration threshold, so no GST is charged on subscriptions and
the advertised price is the total the customer pays.

This is recorded in code as `BUSINESS.gstRegistered` in
[`src/lib/business.ts`](../src/lib/business.ts). Every place the site mentions
tax reads from `taxNote()`, so changing that one flag updates the pricing page,
the billing page, the footer, the Terms and the Subscription & Refund Policy
together.

## When registration becomes compulsory

You must register within 21 days of your **GST turnover** reaching $75,000 in
any rolling 12-month period — that is, either the last 12 months or the next
12 months as you reasonably expect them. It is not tied to the financial year,
so it can arrive mid-year if growth is quick.

At $9.99 a month, $75,000 is roughly 625 continuous Personal Premium
subscribers. Worth watching, not worth pre-empting.

## Why not register voluntarily

Registration is allowed below the threshold, but for this business it costs
money rather than saving it:

- You would remit 1/11th of every subscription to the ATO — about 91c on a
  $9.99 plan — unless prices rise to compensate.
- The offset is GST credits on business purchases, but the main suppliers here
  (Stripe, Cloudflare, Neon, Resend) are overseas and largely do not charge
  Australian GST, so there is little to claim back.
- The likely result is a net payment to the ATO each period, not a refund.
- Voluntary registration generally commits you for 12 months, plus BAS
  lodgements.

**GST registration is not how business expenses are claimed.** Deductions for
hosting, software, home office and similar are claimed against income tax and
are available whether or not you are registered for GST. That is usually what
people have in mind when they expect a refund.

## What to do when the time comes

1. Register through ATO Online Services for Business (needs myGovID and RAM),
   by phone on 13 28 66, or through a registered tax agent.
2. Decide whether to raise prices or absorb the 10%. Absorbing it on the
   $9.99 plan costs about $10.90 per subscriber per year in margin.
3. Set `gstRegistered: true` in `src/lib/business.ts` and redeploy.
4. Update Stripe tax settings so invoices show GST correctly.
5. Note the change in the Subscription & Refund Policy — clause 8 already
   commits to advance notice of price changes.

## Pension interactions

If you receive a Centrelink pension, **business income can affect your
payment**, and the rules differ from wage income — sole trader profit is
generally assessed after allowable business deductions. This is separate from
GST and applies whether or not you register.

Tell Services Australia when the business starts earning, and ask how the
income and any business assets will be assessed. Reporting late can create a
debt that is far more expensive than the tax itself.

## Caveat

This file records a business decision and the reasoning behind it. It is not
tax advice. Confirm the position with a registered tax agent before acting on
it, particularly before registering or changing prices.
