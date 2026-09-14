/**
 * A stand-in bank used when no data recipient is configured.
 *
 * It is not a mock in the testing sense — it is a working provider that a
 * person can connect to and watch behave. Card purchases arrive as pending
 * authorisations and settle roughly a day later, direct debits post straight
 * away, and balances move as things clear. That makes the whole pending →
 * cleared pipeline demonstrable on a fresh deployment, and gives the test
 * suite something deterministic to reconcile against.
 *
 * Everything is derived from the connection id and the clock, so no state is
 * kept here: two syncs a minute apart see the same transactions with the same
 * ids, and a sync a day later sees yesterday's authorisations settled.
 */

import {
  type BankAccountSnapshot,
  type BankInstitution,
  type BankProvider,
  type BankTransactionSnapshot,
  type ConnectionState,
} from "./types";
import { addDays, todayIso } from "@/lib/dates";

/** Authorisations settle at this age — the usual Australian card cycle. */
export const SANDBOX_SETTLEMENT_HOURS = 26;

const INSTITUTIONS: BankInstitution[] = [
  { id: "sandbox-everyday", name: "Demo Bank — Everyday", category: "bank" },
  { id: "sandbox-mutual", name: "Demo Mutual Bank", category: "bank" },
];

const MERCHANTS: Array<{
  name: string;
  description: string;
  /** Cents, always a debit. Cards go pending first; debits post immediately. */
  amountCents: number;
  card: boolean;
}> = [
  { name: "Woolworths", description: "WOOLWORTHS 1234 SYDNEY", amountCents: -8_940, card: true },
  { name: "Ampol", description: "AMPOL FOODARY ALEXANDRIA", amountCents: -7_215, card: true },
  { name: "Coffee Anthology", description: "SQ *COFFEE ANTHOLOGY", amountCents: -6_50, card: true },
  { name: "Opal", description: "TRANSPORTFORNSW OPAL", amountCents: -4_420, card: true },
  { name: "Netflix", description: "NETFLIX.COM", amountCents: -1_899, card: false },
  { name: "Origin Energy", description: "ORIGIN ENERGY DIRECT DEBIT", amountCents: -21_450, card: false },
  { name: "Bunnings", description: "BUNNINGS 449 ALEXANDRIA", amountCents: -13_680, card: true },
  { name: "Chemist Warehouse", description: "CHEMIST WAREHOUSE 22", amountCents: -3_215, card: true },
];

/** Deterministic 32-bit hash — same input, same stream, on every worker. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: T[], seed: string): T {
  return items[hash(seed) % items.length];
}

function accountIds(connectionId: string) {
  return {
    everyday: `${connectionId}-everyday`,
    savings: `${connectionId}-savings`,
  };
}

type Generated = BankTransactionSnapshot & { occurredAt: number };

/**
 * The ledger the demo bank would hold: 45 days of activity, pay on the 15th
 * and the last day of each fortnight, and a handful of purchases a day.
 */
function generate(connectionId: string, now: number): Generated[] {
  const ids = accountIds(connectionId);
  const out: Generated[] = [];
  const settleMs = SANDBOX_SETTLEMENT_HOURS * 3_600_000;

  for (let dayAgo = 45; dayAgo >= 0; dayAgo -= 1) {
    const dayStart = now - dayAgo * 86_400_000;
    const occurredOn = addDays(todayIso(), -dayAgo);
    const daySeed = `${connectionId}:${occurredOn}`;

    // Two or three purchases a day, chosen deterministically for the date.
    const count = 2 + (hash(daySeed) % 2);

    for (let i = 0; i < count; i += 1) {
      const seed = `${daySeed}:${i}`;
      const merchant = pick(MERCHANTS, seed);
      // Vary the amount a little so the list does not look synthetic.
      const jitter = (hash(`${seed}:amt`) % 900) - 450;
      const amountCents = merchant.amountCents - Math.abs(jitter);
      // Spread purchases through the waking hours of that day.
      const occurredAt = dayStart - (dayStart % 86_400_000) + (8 + i * 4) * 3_600_000;
      const age = now - occurredAt;
      const settled = !merchant.card || age >= settleMs;

      out.push({
        providerTransactionId: `sbx-${hash(seed).toString(36)}`,
        providerAccountId: ids.everyday,
        amountCents,
        description: merchant.description,
        merchant: merchant.name,
        occurredOn,
        clearedOn: settled ? addDays(occurredOn, merchant.card ? 1 : 0) : null,
        status: settled ? "posted" : "pending",
        providerCategory: null,
        occurredAt,
      });
    }

    // Salary every second Thursday, and the rent that follows it.
    const dayNumber = Math.floor(occurredAt(occurredOn) / 86_400_000);
    if (dayNumber % 14 === 0) {
      out.push({
        providerTransactionId: `sbx-pay-${occurredOn}`,
        providerAccountId: ids.everyday,
        amountCents: 342_680,
        description: "SALARY PAYMENT",
        merchant: "Employer",
        occurredOn,
        clearedOn: occurredOn,
        status: "posted",
        providerCategory: "Salary",
        occurredAt: dayStart,
      });
      out.push({
        providerTransactionId: `sbx-rent-${occurredOn}`,
        providerAccountId: ids.everyday,
        amountCents: -125_000,
        description: "RENT PAYMENT REAL ESTATE",
        merchant: "Real estate",
        occurredOn,
        clearedOn: occurredOn,
        status: "posted",
        providerCategory: "Rent",
        occurredAt: dayStart,
      });
      out.push({
        providerTransactionId: `sbx-save-${occurredOn}`,
        providerAccountId: ids.savings,
        amountCents: 40_000,
        description: "TRANSFER TO SAVINGS",
        merchant: null,
        occurredOn,
        clearedOn: occurredOn,
        status: "posted",
        providerCategory: "Savings",
        occurredAt: dayStart,
      });
    }
  }

  return out;
}

function occurredAt(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

const OPENING_EVERYDAY = 412_355;
const OPENING_SAVINGS = 1_284_090;

export const sandboxProvider: BankProvider = {
  key: "sandbox",
  label: "Demo bank (no credentials needed)",
  live: false,

  async listInstitutions() {
    return INSTITUTIONS;
  },

  async startConsent({ userId, institutionId, returnUrl }) {
    // A real provider hosts the consent screen; the demo bank hands the person
    // straight back so the rest of the flow is identical.
    const connectionId = `sbx-${hash(`${userId}:${institutionId ?? "sandbox-everyday"}`).toString(36)}`;
    const url = new URL(returnUrl);
    url.searchParams.set("demo", "1");
    return {
      url: url.toString(),
      ref: { providerConnectionId: connectionId, providerUserId: userId },
      expiresAt: new Date(Date.now() + 365 * 86_400_000),
    };
  },

  async finaliseConsent(ref) {
    return { ref, state: await this.getConnection(ref) };
  },

  async getConnection(_ref): Promise<ConnectionState> {
    return {
      status: "active",
      institutionId: "sandbox-everyday",
      institutionName: "Demo Bank — Everyday",
      // CDR consent runs a year at most; the demo mirrors that.
      consentExpiresAt: new Date(Date.now() + 365 * 86_400_000),
      error: null,
    };
  },

  async listAccounts(ref): Promise<BankAccountSnapshot[]> {
    const now = Date.now();
    const rows = generate(ref.providerConnectionId, now);
    const ids = accountIds(ref.providerConnectionId);

    const sum = (accountId: string, only: "posted" | "all") =>
      rows
        .filter(
          (row) =>
            row.providerAccountId === accountId &&
            (only === "all" || row.status === "posted"),
        )
        .reduce((total, row) => total + row.amountCents, 0);

    return [
      {
        providerAccountId: ids.everyday,
        name: "Demo Everyday",
        type: "transaction",
        bsbLast3: "082",
        accountLast4: "4417",
        currency: "AUD",
        ledgerBalanceCents: OPENING_EVERYDAY + sum(ids.everyday, "posted"),
        availableBalanceCents: OPENING_EVERYDAY + sum(ids.everyday, "all"),
      },
      {
        providerAccountId: ids.savings,
        name: "Demo Saver",
        type: "savings",
        bsbLast3: "082",
        accountLast4: "9302",
        currency: "AUD",
        ledgerBalanceCents: OPENING_SAVINGS + sum(ids.savings, "posted"),
        availableBalanceCents: OPENING_SAVINGS + sum(ids.savings, "all"),
      },
    ];
  },

  async listTransactions(ref, since): Promise<BankTransactionSnapshot[]> {
    return generate(ref.providerConnectionId, Date.now())
      .filter((row) => row.occurredOn >= since)
      .map(({ occurredAt: _occurredAt, ...row }) => row);
  },

  async revoke() {
    /* Nothing is held at the demo bank. */
  },

  async verifyWebhook(_request, rawBody) {
    // The demo bank has no signing key; a delivery is accepted as-is so the
    // webhook route can be exercised locally with curl.
    try {
      const payload = JSON.parse(rawBody) as {
        eventId?: string;
        type?: string;
        connectionId?: string;
      };
      return {
        ok: true,
        eventId: payload.eventId ?? crypto.randomUUID(),
        type: payload.type ?? "sandbox.test",
        providerConnectionIds: payload.connectionId ? [payload.connectionId] : [],
        payload,
      };
    } catch {
      return { ok: false, reason: "Body was not JSON." };
    }
  },
};
