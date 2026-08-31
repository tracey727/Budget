# Email setup

Genevieve App sends two account emails: **confirm your email address** at
sign-up, and **reset your password**. Both go through
[Resend](https://resend.com), whose HTTP API works inside Cloudflare Workers
(SMTP does not).

Until this is configured, both features degrade safely rather than breaking:
the app logs the link instead of sending it, and the forgot-password page shows
a notice saying delivery is not configured. Nobody is locked out of signing up.

---

## The API key is not enough

This is the step people miss. An API key alone lets you send **only to the
email address you signed up to Resend with**. To send to customers you must
also verify the domain you send *from*, by adding DNS records.

So there are three things, not one:

1. An API key
2. A verified sending domain (DNS records)
3. A `from` address on that verified domain

---

## Step 1 — Create the account and add your domain

1. Sign up at [resend.com](https://resend.com). The free tier covers 3,000
   emails a month and 100 a day, which is far more than sign-ups and password
   resets will use at launch.
2. Go to **Domains → Add Domain** and enter `genevieveapp.com.au`.
3. Resend shows you a set of DNS records. There are normally three:

   | Type | Purpose |
   |---|---|
   | `TXT` (SPF) | Says Resend is allowed to send for your domain |
   | `TXT` (DKIM) | Cryptographically signs your mail so it is not forged |
   | `MX` or `TXT` (DMARC, optional but recommended) | Tells receivers what to do with mail that fails the above |

## Step 2 — Add those records where your domain lives

Add them at whoever manages DNS for `genevieveapp.com.au` — your registrar
(GoDaddy, Crazy Domains, VentraIP, Namecheap) or Cloudflare if the domain is
already there.

If the domain is on Cloudflare: **Dashboard → your domain → DNS → Add record**,
and paste each value exactly as Resend gives it.

Two things that trip people up:

- **Turn the proxy off** (grey cloud, not orange) for these records. They are
  verification records, not web traffic.
- **Do not add your domain to the record name.** If Resend says the name is
  `resend._domainkey`, enter exactly that — many DNS panels append
  `.genevieveapp.com.au` for you, and typing it yourself produces
  `resend._domainkey.genevieveapp.com.au.genevieveapp.com.au`, which silently
  fails.

DNS usually propagates in minutes but can take up to 48 hours. Resend shows
**Verified** when it is ready.

## Step 3 — Create the API key

**API Keys → Create API Key**. Give it *Sending access* only — it does not need
full permissions. Copy it immediately; Resend shows it once.

## Step 4 — Give it to the app

Locally, in `.dev.vars`:

```
RESEND_API_KEY="re_your_key_here"
EMAIL_FROM="Genevieve App <noreply@genevieveapp.com.au>"
```

In production:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npm run cf:deploy
```

`EMAIL_FROM` **must** be on the domain you verified. `noreply@genevieveapp.com.au`
works once `genevieveapp.com.au` is verified; a Gmail or Outlook address will
be rejected.

## Step 5 — Test it

1. Sign up with a real address you can check.
2. The confirmation email should arrive within a few seconds.
3. Click the link — it should say *Email confirmed*.
4. Log out, use **Forgot password?**, and confirm that email arrives too.

Check your junk folder on the first send. If mail lands in spam, the usual
cause is a missing or wrong DKIM record.

---

## Why the app asks for confirmation at all

A confirmed address is required before paid checkout. That is deliberate: it is
the only way renewal notices, receipts and failed-payment warnings actually
reach a customer, and it keeps throwaway addresses out of billing. It also
means a subscriber can always recover their account by email.

---

## Deliverability, briefly

- **Use a subdomain if you prefer**, e.g. `mail.genevieveapp.com.au`. Problems
  with transactional mail then cannot affect your main domain's reputation.
- **Add DMARC** once SPF and DKIM verify. Start with `p=none`, which reports
  without rejecting anything.
- **Do not send marketing from this key.** Keep account email and any future
  newsletter separate, so a marketing complaint never stops a password reset
  from being delivered.

---

## Contact addresses

Support, privacy and billing all currently point at
`tracey@genevieveapp.com.au`, set in
[`src/lib/business.ts`](../src/lib/business.ts). That mailbox must exist and be
monitored before launch — it is published in the Terms, Privacy Policy,
Subscription & Refund Policy and the contact page, and the Privacy Act requires
a working route for privacy requests and complaints.

You can split them later (`support@`, `privacy@`, `billing@`) by editing those
three fields; every page follows automatically.
