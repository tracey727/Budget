# Legal and Billing Release Gate — Gen Money

Gen Money is **the travellers budget** — a budgeting tool for people on the
road. The legal documents describe that product, not a generic budget app.

Do not enable live Stripe charging until every item that applies to launch is
complete and evidenced.

Adapted from the release gate used for GENEVIEVE — The Budget Travels, and
kept deliberately in the same shape so both products can be reviewed together.

## Business identity

- [x] Operator: Tracey Ann Kennedy trading as Genevieve App
- [x] ABN: 36 530 564 761
- [x] Postal address: PO Box 475, Labrador QLD 4215
- [x] Support email: tracey@genevieveapp.com.au
- [x] Governing law stated as Queensland, Australia
- [x] Identity published in Terms, Privacy, Subscription Policy, Contact, footer
- [x] **GST: not registered.** Turnover is below the $75,000 ATO registration
      threshold, so no GST is charged on subscriptions. The site states this
      plainly rather than hedging, driven by `BUSINESS.gstRegistered` in
      `src/lib/business.ts` — flip that flag if registration ever changes.
- [ ] Re-check the GST position if annual turnover approaches $75,000.
- [ ] Decide whether Gen Money needs its own registered business name, or
      continues to trade under Genevieve App.

## Account and entitlement integrity

- [x] Email + password accounts with PBKDF2-SHA256 (600k iterations, per-user salt)
- [x] Session tokens stored as SHA-256 hashes, not raw values
- [x] Every database query bounded to the signed-in user
- [x] Plan limits enforced server-side in actions, not only hidden in the UI
- [x] Checkout accepts only price lookup keys from our own catalogue
- [x] Stripe identifiers are not exposed through any public API response
- [x] **Password reset implemented.** Hashed single-use tokens, 1-hour expiry,
      earlier tokens invalidated on reissue, all sessions destroyed on reset,
      no email enumeration, 2-minute resend throttle. 21 tests cover it.
- [ ] Test entitlement persistence across a second device and browser
- [ ] Set `RESEND_API_KEY` and `EMAIL_FROM` in Cloudflare, and verify the
      sending domain in Resend, or password reset emails will not send

## Subscription disclosure

- [x] Recurring price shown in AUD before purchase
- [x] Billing period shown before purchase
- [x] Automatic renewal stated before purchase
- [x] **Founding step-up disclosed at the point of purchase** — pricing banner,
      plan card, in-app billing card, Subscription Policy and Terms all state
      that $69/$139 covers year one and then renews at $99/$199
- [x] No minimum commitment beyond the selected billing period
- [x] No pre-selected paid extras
- [x] Cancellation available through the Stripe Customer Portal, no phone call
- [ ] Confirm Stripe Checkout itself displays the same renewal wording once the
      live catalogue exists

## Stripe

- [x] Catalogue defined in code with stable lookup keys (`npm run stripe:setup`)
- [x] Webhook signature verification, with forged signatures rejected (verified
      inside workerd)
- [x] Webhook idempotency: event ids recorded before processing; a failed
      handler releases the claim so Stripe's retry can succeed
- [ ] Run `npm run stripe:setup` with the **live** key after pricing is approved
- [ ] Set `STRIPE_SECRET_KEY` in Cloudflare as a secret
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Cloudflare as a secret
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production domain
- [ ] Configure Stripe Public details with the live Terms and Privacy URLs
- [ ] Configure Customer Portal to allow payment-method updates and cancellation
- [ ] Enable Stripe failed-payment recovery and subscriber emails
- [ ] Register the production webhook at `/api/stripe/webhook`
- [ ] Subscribe it to: `checkout.session.completed`,
      `customer.subscription.created`, `customer.subscription.updated`,
      `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- [ ] Run a full test-mode subscription, renewal, failure simulation, portal
      cancellation and webhook replay before accepting live payments

## Consumer law

- [x] Terms preserve non-excludable Australian Consumer Law rights
- [x] Subscription policy does not use a blanket "no refunds" term
- [x] Renewal and cancellation wording is visible before purchase
- [x] Price-change wording is prospective, with notice and a chance to cancel
- [x] Cancelling reverts to the free Starter plan; records are not deleted
- [x] App is described as budgeting/record-keeping, expressly not financial
      product advice, credit assistance or tax advice
- [x] Trip budgets, fuel and daily-spend figures described as decision-support
      estimates, expressly not guarantees of fuel prices, site availability,
      fees, road conditions or weather
- [x] Terms state travel decisions remain the user's, official sources take
      priority, and the app is not a navigation or safety service
- [x] Privacy Policy states plainly that no location is collected or stored
- [x] GST and financial-year summaries described as record-keeping aids, not a
      lodged BAS
- [ ] **Obtain Australian legal review before public paid launch**, especially
      of the founding promotion, since a first-year price that steps up on
      renewal attracts ACCC attention.

## Privacy and communications

- [x] Public Privacy Policy explains the actual data flows
- [x] Card data handled by Stripe-hosted Checkout, never stored in our database
- [x] No bank credentials collected; no screen-scraping; no geolocation
- [x] Privacy contact and complaint route published, including OAIC escalation
- [x] Overseas processing disclosed (Stripe, Cloudflare, Neon)
- [ ] Write and store a data-breach response plan
- [ ] If marketing email is introduced, implement consent, sender
      identification and functional unsubscribe before sending campaigns
- [ ] Re-audit the provider list whenever Stripe, Cloudflare or Neon change

## Operational release test

- [x] `npm run typecheck`, `npm run lint` and `npm test` pass
- [x] `next build` and `opennextjs-cloudflare build` succeed
- [x] `wrangler deploy --dry-run` validates inside the Workers size limit
- [x] Public routes return 200 and `/app` redirects to `/login` (verified in workerd)
- [x] Password hashing and Stripe signature verification verified in workerd
- [ ] Apply migrations to production Neon (`npm run db:migrate`)
- [ ] `/api/health` returns `status: ok` against production
- [ ] Invalid Stripe webhook signature returns 400 in the deployed environment
- [ ] Confirm replaying the same Stripe event id does not double-apply a plan

## Launch status

Application code, legal pages and billing integration are complete and
verified in a local Workers runtime. **Live charging is not approved** until the
unchecked items above — particularly account recovery, GST registration status,
and Australian legal review of the founding promotion — are complete.
