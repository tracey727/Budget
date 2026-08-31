# GENEVIEVE App — Budget App

**Take Control of Every Dollar** — the Genevieve App budget app, built for
professionals and everyday people alike. Runs at scale on Cloudflare Workers
with a Neon Postgres database and Stripe subscriptions.

- **Frontend/backend:** Next.js 15 (App Router, React 19, Server Actions)
- **Hosting:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Database:** Neon serverless Postgres via Drizzle ORM (HTTP driver)
- **Payments:** Stripe subscriptions, five AUD price points
- **Email:** Resend (HTTP API, Workers-compatible) for password resets
- **Localisation:** AUD currency, DD/MM/YYYY dates, 1 Jul–30 Jun financial year

---

## What's in the box

### For everyone (Starter, free)
- Multi-account tracking with live balances and net position
- Transactions with categories, merchants and notes
- Monthly budgets with progress bars and over-budget warnings
- Savings goals with per-month contribution maths
- Dashboard: money in/out, net, spending breakdown, upcoming bills

### Personal Premium ($9.99/mo · $99/yr)
- Unlimited accounts, transactions, budgets and goals
- **CSV bank statement import** with automatic column detection and duplicate
  suppression — tested against CommBank, NAB, Westpac, ANZ and Bendigo formats
- Recurring bill tracking (weekly → yearly) with due-date warnings
- 12-month cash-flow reporting and category trends
- Full CSV export

### Professional ($19.99/mo · $199/yr)
- Everything in Personal Premium
- Business/personal transaction split
- GST tracking (10%, 1/11th of GST-inclusive amounts) with BAS-ready summaries
- Deductible expense tagging
- Australian financial-year reporting
- Priority support

### Pricing model

| Plan | Monthly | Annual | Founding (first year) | Purpose |
|---|---|---|---|---|
| Starter | FREE | FREE | — | Get people into the app |
| Personal Premium | $9.99 AUD | $99 AUD | $69 AUD | Main consumer product |
| Professional | $19.99 AUD | $199 AUD | $139 AUD | Sole traders / professionals |

All prices in AUD. **Not registered for GST** (turnover is below the $75,000
ATO threshold), so no GST is added — the price shown is the total payable.
Founding prices are a launch promotion covering the first year, then renew at
the standard annual rate.

Prices live in exactly one place — [`src/lib/plans.ts`](src/lib/plans.ts). The
marketing page, the in-app billing page, the entitlement checks and the Stripe
bootstrap script all read from it, so changing a price there changes it
everywhere.

---

## Deploying to production

You need three accounts: **Neon**, **Cloudflare**, and **Stripe**. Budget about
30 minutes end to end.

### 1. Create the Neon database

1. Create a project at [console.neon.tech](https://console.neon.tech).
2. Choose a region close to your users — **AWS ap-southeast-2 (Sydney)** for an
   Australian audience.
3. Copy the **pooled** connection string (the host contains `-pooler`).

Apply the schema. Either paste
[`setup/database-setup.sql`](setup/database-setup.sql) into Neon's SQL Editor —
no tooling required — or run the migrations from a terminal:

```bash
npm install
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" \
  npm run db:migrate
```

This creates 12 tables: `users`, `sessions`, `password_reset_tokens`,
`email_verification_tokens`, `accounts`, `categories`, `transactions`,
`budgets`, `goals`, `recurring_bills`, `subscriptions` and `stripe_events`.

### 2. Set up the Stripe catalogue

```bash
STRIPE_SECRET_KEY="sk_test_..." npm run stripe:setup
```

This creates two products and six prices, each with a stable `lookup_key`
(`personal_monthly`, `personal_annual`, `personal_founding_annual`,
`professional_monthly`, `professional_annual`,
`professional_founding_annual`). The app resolves prices by lookup key, so test
and live modes can have different price IDs with no code change.

Re-run it with your **live** key before launch. It is idempotent — existing
products and prices are reused, never duplicated.

Then in the Stripe dashboard:
- Enable the **Customer Portal** at Settings → Billing → Customer portal.
- Add a webhook endpoint (see step 4).

### 3. Deploy to Cloudflare

```bash
npx wrangler login

# Set your production origin in wrangler.jsonc first:
#   "vars": { "NEXT_PUBLIC_APP_URL": "https://your-domain.com.au" }

npx wrangler secret put DATABASE_URL
npx wrangler secret put SESSION_SECRET        # openssl rand -base64 32
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET # from step 4
npx wrangler secret put RESEND_API_KEY        # for password reset emails
npx wrangler secret put EMAIL_FROM            # e.g. "Genevieve App <noreply@yourdomain.com.au>"

npm run cf:deploy
```

`NEXT_PUBLIC_APP_URL` must match your real origin exactly (no trailing slash)
or Stripe redirects and login `next=` links will bounce to the wrong host.

### 4. Point Stripe at your webhook

In the Stripe dashboard → Developers → Webhooks → Add endpoint:

- **URL:** `https://your-domain.com.au/api/stripe/webhook`
- **Events:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Copy the signing secret (`whsec_...`) and store it:

```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npm run cf:deploy   # redeploy so the Worker picks it up
```

### 5. Verify

```bash
curl https://your-domain.com.au/api/health
```

Expect `{"status":"ok","database":"ok","stripe":"configured","missingEnv":[]}`.
A `503` names exactly which variable is missing or whether the database is
unreachable — it never echoes secret values.

Then run a live smoke test: sign up, add a transaction, and complete a checkout
with a [Stripe test card](https://stripe.com/docs/testing) (`4242 4242 4242
4242`). The plan badge in the header should flip within a few seconds of the
webhook landing.

### Custom domain

In the Cloudflare dashboard → Workers & Pages → `gen-money` → Settings →
Domains & Routes → **Add custom domain**. Cloudflare provisions the TLS
certificate automatically. Update `NEXT_PUBLIC_APP_URL`, redeploy, and update
the Stripe webhook URL to match.

---

## Local development

```bash
npm install
cp .env.example .env.local     # fill in your values
npm run dev                    # http://localhost:3000
```

To run against the real Workers runtime (recommended before any deploy):

```bash
cp .dev.vars.example .dev.vars # fill in your values
npm run cf:preview
```

Forward Stripe webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production Next.js build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | CSV parser (23), reset-token (21) and verification (22) suites |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:studio` | Drizzle Studio |
| `npm run stripe:setup` | Create/update the Stripe catalogue |
| `npm run cf:build` | Build the Cloudflare Worker |
| `npm run cf:preview` | Run the Worker locally |
| `npm run cf:deploy` | Deploy to Cloudflare |

---

## Built to scale

Sized for thousands of concurrent Australian users:

- **Cloudflare Workers** run at the edge with no cold starts and no instance
  count to manage. Smart placement puts execution near the database.
- **Neon's HTTP driver** issues one `fetch` per query, so there is no
  connection pool to exhaust across isolates — the usual failure mode for
  serverless Postgres. Use the **pooled** connection string.
- **Every list query is indexed and paginated.** Transactions are indexed on
  `(user_id, occurred_on)`, and aggregates (`monthSummary`, `spendByCategory`,
  `cashflowSeries`) are computed in Postgres rather than by loading rows into
  the Worker.
- **The bundle is ~1.4 MB gzipped**, inside the 3 MB Workers limit.
- **Idempotent webhooks.** Every Stripe event id is recorded before processing,
  so retries and duplicate deliveries cannot double-apply. A handler failure
  releases the claim so Stripe's retry can succeed.

### Security

- **Email verification** on sign-up, and a confirmed address is required
  before any paid checkout — so renewal and receipt emails can actually reach
  the customer, and throwaway addresses stay out of billing.
- Passwords hashed with **PBKDF2-SHA256, 600,000 iterations** and a random
  per-user salt, verified in constant time. (Workers has no scrypt/argon2; this
  is the strongest primitive the runtime offers, at the OWASP-recommended
  iteration count.)
- **Session tokens are stored as SHA-256 hashes** — a database dump cannot be
  replayed to sign in as a user. Cookies are HttpOnly, SameSite=Lax, Secure in
  production.
- **Every query is scoped by `user_id`**, and ownership is re-checked
  server-side on every mutation.
- **Plan limits are enforced in server actions**, not just hidden in the UI, so
  a crafted POST cannot exceed them.
- Checkout only accepts price lookup keys from our own catalogue, so a crafted
  URL cannot point checkout at an arbitrary Stripe price.
- Login reports one message for both unknown-email and wrong-password, and runs
  a hash verification either way to avoid leaking which accounts exist.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set on every response.
- The app never asks for or stores bank credentials, and never sees card
  numbers — Stripe handles those.

---

## Legal and business identity

Business details live in one place — [`src/lib/business.ts`](src/lib/business.ts):

```
Tracey Ann Kennedy trading as Genevieve App
ABN 36 530 564 761
PO Box 475, Labrador QLD 4215, Australia
tracey@genevieveapp.com.au
Governing law: Queensland, Australia
```

Change it there and the Terms, Privacy Policy, Subscription & Refund Policy,
Contact page, legal index and footer all follow.

Four published documents, linked from the footer and before any payment:

| Page | Covers |
|---|---|
| `/legal` | Index of everything below |
| `/terms` | What the app is and is not, accounts, ACL rights, QLD governing law |
| `/subscriptions` | Recurring price, auto-renewal, **founding step-up**, cancellation, refunds |
| `/privacy` | Data collected, overseas processing, security, OAIC escalation |

The founding promotion renews at the standard rate after year one. Because a
first-year price that steps up attracts ACCC attention, that disclosure appears
in five places: the pricing banner, the plan card next to the button, the in-app
billing card, the Subscription & Refund Policy, and the Terms.

## Before you launch

The full pre-launch checklist is in
[`docs/LEGAL_RELEASE_GATE.md`](docs/LEGAL_RELEASE_GATE.md). The items that
genuinely block a paid launch:

- [ ] **Set up email** — see [`docs/EMAIL_SETUP.md`](docs/EMAIL_SETUP.md).
      An API key alone is not enough: the sending domain must be verified with
      DNS records, or Resend will only deliver to your own address. Sign-up
      confirmation and password reset both depend on this.
- [ ] **Get Australian legal review of the founding promotion** before public
      paid launch.
- [ ] Decide whether Genevieve App needs its own registered business name, or
      continues to trade under Genevieve App
- [ ] Re-check the GST position if turnover approaches $75,000 (see
      [`docs/GST.md`](docs/GST.md))
- [ ] Re-run `npm run stripe:setup` with your **live** key
- [ ] Point the Stripe webhook at your production domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to your live origin and redeploy
- [ ] Confirm `/api/health` returns `status: ok`
- [ ] Run one real end-to-end checkout in live mode

---

## Project layout

```
src/
  app/
    page.tsx                  Landing page
    pricing/                  Pricing table with monthly/annual toggle
    login/  signup/           Authentication
    forgot-password/          Request a reset link
    reset-password/           Choose a new password
    verify-email/             Confirm an email address
    legal/                    Legal index
    terms/                    Terms of Use
    subscriptions/            Subscription & Refund Policy
    privacy/  contact/
    app/                      Authenticated application
      page.tsx                Dashboard
      transactions/           List, create, CSV import
      accounts/  budgets/  goals/  bills/  reports/  billing/
    api/
      billing/checkout        Stripe Checkout redirect
      billing/portal          Stripe Customer Portal redirect
      stripe/webhook          Idempotent subscription sync
      export/transactions     CSV export
      health                  Deployment health check
  lib/
    plans.ts                  Pricing and entitlements (single source of truth)
    business.ts               Business identity: ABN, address, contact, jurisdiction
    env.ts                    Lazy, Workers-safe environment access
    money.ts  dates.ts        AUD and Australian date/FY/GST helpers
    csv.ts                    Bank statement parser
    labels.ts                 Shared display labels
    auth/                     PBKDF2 passwords, hashed sessions, reset and
                              verification tokens, route guards
    email/                    Resend sender and email templates
    db/                       Drizzle schema and Neon client
    data/                     Queries and sign-up seed data
    actions/                  Server actions (auth, transactions, budgets, …)
  components/                 UI: marketing and app
drizzle/                      Generated SQL migrations
scripts/                      migrate.ts, stripe-setup.ts
tests/                        CSV parser tests
```

---

## Disclaimer

Genevieve App is a budgeting and record-keeping tool. It does not provide financial
product advice and does not take any user's objectives, financial situation or
needs into account. GST and financial-year summaries are record-keeping aids,
not a lodged BAS or tax advice.
