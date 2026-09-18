# Bank connections

How the app gets transactions out of a real bank, and what it does with them
once they arrive.

---

## The problem it solves

A budget built from typed-in receipts is always a few days behind, and a budget
built from a downloaded statement is always a few weeks behind. Worse, both
show a balance that is wrong in a particular way: the money for a purchase made
on Friday is still sitting in the total on Saturday, because the bank has not
settled it yet.

So the ledger tracks three figures rather than one.

| Figure | What it means | Where it comes from |
| --- | --- | --- |
| **Cleared** | Money the bank has settled. The figure on a statement. | Opening balance + all `posted` transactions |
| **Pending** | Authorised but not settled. The amount can still change, and the bank can drop it. | Sum of `pending` transactions |
| **Available** | Cleared + pending. What is genuinely safe to spend. | The two above |
| **Safe to spend** | Available, less bills known to be due. | Dashboard only |

A released authorisation — one the bank abandoned without ever settling — is
marked `declined`. It counts towards none of the three, but stays visible so a
person can see what happened to their money.

---

## Providers

The app talks to a *data recipient*, never to a bank directly. Australian banks
are reached through the Consumer Data Right, and only an accredited recipient
may hold that consent.

| Provider | When it is used | Notes |
| --- | --- | --- |
| **Basiq** | `BASIQ_API_KEY` is set | CDR accredited. Hosted consent screen, so bank credentials never reach this application. |
| **Sandbox** | No key set | A working demo bank with realistic Australian transactions. Card purchases arrive pending and settle about 26 hours later. |

The sandbox is not a mock. It is a full provider implementation, so a fresh
deployment can be connected, synced and reconciled end to end before anyone
signs a commercial agreement — and the test suite reconciles against it.

Adding a provider means implementing `BankProvider` in `src/lib/bank/types.ts`
and registering it in `src/lib/bank/provider.ts`. Nothing above that layer knows
which provider it is talking to; the provider key is stored per connection, so
switching providers leaves existing links working.

---

## What a sync does

`syncConnection()` in `src/lib/bank/sync.ts` runs four steps in order, so a
failure part way through leaves the ledger consistent rather than half-updated.

1. **Mirror the accounts.** Each bank account gets a local account the first
   time it is seen. The bank's own ledger and available balances are stored
   alongside ours.
2. **Reconcile the window.** See below.
3. **Align the opening balance.** A mirrored account's opening balance is set
   to the bank's settled balance less the settled rows we hold, so the cleared
   balance in the app equals the bank's to the cent even though only a window
   of transactions is ever fetched.
4. **Raise alerts.** Cleared payments, released holds, large debits and low
   available balances.

Every pass is recorded in `bank_sync_runs`, so "why is my balance stale?" has an
answer in the interface rather than in the logs.

### Reconciliation

`src/lib/bank/reconcile.ts` is pure — no database, no network — which is what
makes the hard case testable. It produces four outcomes:

- **insert** — a transaction the ledger has never seen.
- **update** — a field the bank revised.
- **clear** — a pending authorisation the bank has now settled.
- **drop** — an authorisation the bank abandoned.

Most banks settle a transaction under the same id, which is the easy path. Some
issue a *new* id for the settlement, so a $64.30 fuel pre-authorisation and a
$91.15 fuel settlement two days later have nothing in common but their shape.
Those are matched by score: same account, same direction, a compatible amount,
a close date, and agreement on who was paid. How far the amount may move
depends on how well the text agrees — a confident merchant match buys a wide
tolerance, because fuel holds and restaurant tips genuinely move the figure;
without one, only an exact amount within a day is trusted.

A pending row that the bank stops reporting is released after
`DROP_AFTER_HOURS` (72), not on the first miss, because banks lag.

---

## Keeping it current

Three things drive a sync:

| Trigger | Route | Latency |
| --- | --- | --- |
| **Webhook** | `POST /api/bank/webhook` | Seconds. The provider pushes when a bank settles something. |
| **Schedule** | `POST /api/cron/sync` | Whatever the schedule is; hourly is sensible. Covers dropped deliveries and overnight settlement. |
| **By hand** | "Sync now" on `/app/bank` | Immediate. |

The webhook verifies the provider's signature before trusting a byte of the
body, and records the event id before doing any work, so a redelivery is a
no-op rather than a second pass over the same transactions.

### Setting up the schedule

The endpoint is protected by a shared secret:

```bash
curl -X POST https://your-host/api/cron/sync \
     -H "Authorization: Bearer $CRON_SECRET"
```

Set `CRON_SECRET` (`openssl rand -hex 32`) as a Worker secret. Without it the
endpoint returns 503 and scheduled syncing is simply off — webhooks and the
manual button still work.

Point any scheduler that can make an HTTPS request at it. A Cloudflare Cron
Trigger on a small separate Worker is the usual choice:

```jsonc
// wrangler.jsonc of the scheduling worker
{ "triggers": { "crons": ["0 * * * *"] } }
```

Each run syncs at most 25 connections, oldest first, so it cannot exceed a
Worker's CPU budget; the rest are picked up next time. The same run also checks
bills, budgets and goals, and sends the email digest.

---

## Privacy and consent

- Bank credentials are never seen, transmitted or stored by this application.
  The person authenticates on their bank's own screen, through the provider.
- The connection is **read-only**. Nothing can be moved or paid.
- What is stored is an opaque connection id, the account details a bank chooses
  to publish (name, type, masked BSB and last four digits) and the transactions
  themselves.
- CDR consent lasts at most 12 months. `consentExpiresAt` is tracked, shown on
  `/app/bank`, and an alert is raised before it lapses.
- Disconnecting revokes consent at the provider and stops all syncing.
  Transactions already imported are kept — they are the person's financial
  history, not the provider's — and balances freeze at their last known value
  rather than vanishing.

---

## Data model

| Table | Holds |
| --- | --- |
| `bank_connections` | One consented link to an institution, its status and consent expiry. |
| `accounts` | Gains `connection_id`, `provider_account_id`, the bank's two balances, and `sync_enabled`. |
| `transactions` | Gains `status`, `cleared_at`, `pending_since`, `source`, `provider_transaction_id` and `settled_pending_id`. |
| `bank_sync_runs` | One row per refresh attempt, with counts and any error. |
| `bank_webhook_events` | Provider event ids already applied, for idempotency. |
| `alerts` | Automated findings, deduplicated per person by `dedupe_key`. |
| `category_rules` | "Anything containing WOOLWORTHS is Groceries." |

---

## Testing it without a bank

```bash
npm test                 # reconciliation, rules and balance arithmetic
npm run dev              # then visit /app/bank and connect the demo bank
```

The demo bank's transactions are derived from the connection id and the clock,
so two syncs a minute apart see identical data, and a sync the next day sees
yesterday's authorisations settled. That is enough to watch a transaction move
from pending to cleared, and to watch the balance correct itself when it does.
