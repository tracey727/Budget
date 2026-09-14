/**
 * Basiq — the production data recipient.
 *
 * Basiq is accredited under the Australian Consumer Data Right, so the
 * credentials a person types go to their bank through Basiq's hosted consent
 * screen and never touch this application. What comes back is an opaque
 * connection id plus normalised account and transaction data.
 *
 * Everything here speaks plain `fetch`, which is the only HTTP available
 * inside a Cloudflare Worker.
 *
 * Reference: https://api.basiq.io/reference (API version 3.0)
 */

import {
  BankProviderError,
  type BankAccountSnapshot,
  type BankConnectionRef,
  type BankInstitution,
  type BankProvider,
  type BankTransactionSnapshot,
  type ClearingStatus,
  type ConnectionState,
  type ConsentSession,
  type WebhookVerification,
} from "./types";
import { toCents } from "@/lib/money";
import { todayIso } from "@/lib/dates";
import { timingSafeEqual } from "./signature";

const API = "https://au-api.basiq.io";
const CONSENT_UI = "https://consent.basiq.io/home";
const API_VERSION = "3.0";

/** Server tokens last an hour; re-mint a minute early to avoid a race. */
const TOKEN_TTL_MS = 59 * 60 * 1000;

let serverToken: { value: string; expiresAt: number } | null = null;

function apiKey(): string {
  const key = process.env.BASIQ_API_KEY;
  if (!key) {
    throw new BankProviderError(
      "BASIQ_API_KEY is not configured, so bank connections cannot be made.",
    );
  }
  return key;
}

async function mintToken(scope: "SERVER_ACCESS" | "CLIENT_ACCESS", userId?: string) {
  const body = new URLSearchParams({ scope });
  if (userId) body.set("userId", userId);

  const response = await fetch(`${API}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": API_VERSION,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new BankProviderError(
      `Basiq refused a ${scope} token (${response.status}). ${describe(detail)}`,
      { status: response.status, retryable: response.status >= 500 },
    );
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new BankProviderError("Basiq returned a token response with no token.");
  }
  return json.access_token;
}

async function serverAccessToken(): Promise<string> {
  if (serverToken && serverToken.expiresAt > Date.now()) return serverToken.value;
  const value = await mintToken("SERVER_ACCESS");
  serverToken = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
  return value;
}

/** Pulls the human-readable part out of a Basiq error envelope. */
function describe(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      data?: Array<{ detail?: string; title?: string }>;
    };
    const first = parsed.data?.[0];
    return first?.detail ?? first?.title ?? "";
  } catch {
    return raw.slice(0, 200);
  }
}

async function call<T>(
  path: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<T> {
  const token = await serverAccessToken();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "basiq-version": API_VERSION,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  // A 401 mid-flight means the cached token aged out; mint once and retry.
  if (response.status === 401 && attempt === 0) {
    serverToken = null;
    return call<T>(path, init, attempt + 1);
  }

  if (response.status === 404) {
    throw new BankProviderError(`Basiq has no record of ${path}.`, { status: 404 });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new BankProviderError(
      `Basiq request failed (${response.status}). ${describe(detail)}`,
      { status: response.status, retryable: response.status >= 500 || response.status === 429 },
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* -------------------------------------------------------------------------- */
/*                             Response shapes                                */
/* -------------------------------------------------------------------------- */

type BasiqList<T> = { data?: T[]; links?: { next?: string } };

type BasiqInstitution = {
  id: string;
  name?: string;
  shortName?: string;
  institutionType?: string;
  logo?: { links?: { square?: string } };
};

type BasiqConnection = {
  id: string;
  status?: string;
  lastUsed?: string;
  expiryDate?: string;
  institution?: { id?: string };
  profile?: { fullName?: string };
};

type BasiqAccount = {
  id: string;
  accountNo?: string;
  name?: string;
  class?: { type?: string; product?: string };
  balance?: string;
  availableFunds?: string;
  currency?: string;
  connection?: string;
};

type BasiqTransaction = {
  id: string;
  status?: string;
  description?: string;
  amount?: string;
  account?: string;
  postDate?: string | null;
  transactionDate?: string | null;
  enrich?: { merchant?: { businessName?: string }; category?: { anzsic?: { class?: { title?: string } } } };
  subClass?: { title?: string };
  class?: string;
};

/* -------------------------------------------------------------------------- */
/*                                  Mapping                                   */
/* -------------------------------------------------------------------------- */

/** Basiq account classes mapped onto the app's account types. */
const ACCOUNT_TYPES: Record<string, string> = {
  transaction: "transaction",
  savings: "savings",
  "credit-card": "credit",
  creditCard: "credit",
  mortgage: "loan",
  loan: "loan",
  investment: "investment",
  term: "savings",
  "term-deposit": "savings",
  super: "super",
  foreign: "transaction",
};

function mapAccountType(raw: string | undefined): string {
  if (!raw) return "transaction";
  return ACCOUNT_TYPES[raw] ?? "transaction";
}

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  // Basiq sends full ISO timestamps; the date part is what the ledger stores.
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

function mapStatus(raw: string | undefined): ClearingStatus {
  const value = (raw ?? "").toLowerCase();
  if (value === "pending") return "pending";
  if (value === "declined" || value === "cancelled" || value === "canceled") {
    return "declined";
  }
  return "posted";
}

/**
 * Basiq connection statuses are operational; the app cares about what the
 * person has to do next.
 */
function mapConnectionStatus(raw: string | undefined): ConnectionState["status"] {
  switch ((raw ?? "").toLowerCase()) {
    case "active":
      return "active";
    case "pending":
    case "in-progress":
      return "pending";
    case "invalid":
    case "expired":
      return "expired";
    case "mfa":
    case "mfa-required":
    case "action-required":
      return "action_needed";
    case "revoked":
      return "revoked";
    default:
      return "error";
  }
}

function maskedParts(accountNo: string | undefined): {
  bsbLast3: string | null;
  accountLast4: string | null;
} {
  if (!accountNo) return { bsbLast3: null, accountLast4: null };
  const digits = accountNo.replace(/\D/g, "");
  if (digits.length < 4) return { bsbLast3: null, accountLast4: null };
  // Australian accounts arrive as BSB + number; keep only what is safe to show.
  const bsb = digits.length > 9 ? digits.slice(0, 6) : "";
  return {
    bsbLast3: bsb ? bsb.slice(-3) : null,
    accountLast4: digits.slice(-4),
  };
}

/** Basiq paginates with a `links.next` absolute URL. */
async function collect<T>(firstPath: string, pageLimit = 20): Promise<T[]> {
  const out: T[] = [];
  let path: string | null = firstPath;
  let pages = 0;

  while (path && pages < pageLimit) {
    const page: BasiqList<T> = await call<BasiqList<T>>(path);
    out.push(...(page.data ?? []));
    const next = page.links?.next;
    path = next ? next.replace(API, "") : null;
    pages += 1;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*                                  Provider                                  */
/* -------------------------------------------------------------------------- */

function requireUserId(ref: BankConnectionRef): string {
  if (!ref.providerUserId) {
    throw new BankProviderError(
      "This bank link is missing its Basiq user id and must be reconnected.",
    );
  }
  return ref.providerUserId;
}

export const basiqProvider: BankProvider = {
  key: "basiq",
  label: "Basiq — CDR accredited",
  live: true,

  async listInstitutions(): Promise<BankInstitution[]> {
    const rows = await collect<BasiqInstitution>("/institutions");
    return rows
      .filter((row) => row.id)
      .map((row) => ({
        id: row.id,
        name: row.shortName ?? row.name ?? row.id,
        category: row.institutionType,
        logoUrl: row.logo?.links?.square,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async startConsent({ userId, email, fullName, institutionId, returnUrl }): Promise<ConsentSession> {
    const [firstName, ...rest] = fullName.trim().split(/\s+/);

    // Basiq keys its data on its own user record. One is created per app user
    // and reused; the app's user id is passed so the two can be tied together.
    const created = await call<{ id?: string }>("/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        firstName: firstName || "Customer",
        lastName: rest.join(" ") || "Account",
        name: fullName,
      }),
    }).catch((error: unknown) => {
      // A duplicate email means the person has connected before — find them.
      if (error instanceof BankProviderError && error.status === 400) return null;
      throw error;
    });

    let basiqUserId = created?.id ?? null;

    if (!basiqUserId) {
      const existing = await collect<{ id: string; email?: string }>(
        `/users?filter=user.email.eq('${encodeURIComponent(email)}')`,
        1,
      ).catch(() => []);
      basiqUserId = existing[0]?.id ?? null;
    }

    if (!basiqUserId) {
      throw new BankProviderError(
        "Basiq would not create a customer record for this account.",
      );
    }

    const clientToken = await mintToken("CLIENT_ACCESS", basiqUserId);

    const url = new URL(CONSENT_UI);
    url.searchParams.set("token", clientToken);
    url.searchParams.set("action", "connect");
    if (institutionId) url.searchParams.set("institutionId", institutionId);
    // Basiq appends the outcome to this URL when the person is finished.
    url.searchParams.set("redirectUrl", returnUrl);

    return {
      url: url.toString(),
      // No connection exists until the bank confirms; the Basiq user id stands
      // in until `finaliseConsent` resolves the real one.
      ref: { providerConnectionId: `pending:${userId}`, providerUserId: basiqUserId },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  },

  async finaliseConsent(ref) {
    const basiqUserId = requireUserId(ref);
    const connections = await collect<BasiqConnection>(
      `/users/${basiqUserId}/connections`,
      2,
    );

    if (connections.length === 0) {
      return {
        ref,
        state: {
          status: "pending",
          institutionId: null,
          institutionName: null,
          consentExpiresAt: null,
          error: null,
        },
      };
    }

    // If the handle is still provisional take the newest connection; otherwise
    // keep the one already linked so re-running the callback is harmless.
    const known = connections.find((c) => c.id === ref.providerConnectionId);
    const chosen = known ?? connections[connections.length - 1];

    const institution = chosen.institution?.id
      ? await call<BasiqInstitution>(`/institutions/${chosen.institution.id}`).catch(
          () => null,
        )
      : null;

    return {
      ref: { providerConnectionId: chosen.id, providerUserId: basiqUserId },
      state: {
        status: mapConnectionStatus(chosen.status),
        institutionId: chosen.institution?.id ?? null,
        institutionName:
          institution?.shortName ?? institution?.name ?? chosen.institution?.id ?? null,
        consentExpiresAt: chosen.expiryDate ? new Date(chosen.expiryDate) : null,
        error: null,
      },
    };
  },

  async getConnection(ref): Promise<ConnectionState> {
    const basiqUserId = requireUserId(ref);
    try {
      const connection = await call<BasiqConnection>(
        `/users/${basiqUserId}/connections/${ref.providerConnectionId}`,
      );
      return {
        status: mapConnectionStatus(connection.status),
        institutionId: connection.institution?.id ?? null,
        institutionName: null,
        consentExpiresAt: connection.expiryDate ? new Date(connection.expiryDate) : null,
        error: null,
      };
    } catch (error) {
      if (error instanceof BankProviderError && error.status === 404) {
        return {
          status: "revoked",
          institutionId: null,
          institutionName: null,
          consentExpiresAt: null,
          error: "The bank no longer recognises this connection.",
        };
      }
      throw error;
    }
  },

  async listAccounts(ref): Promise<BankAccountSnapshot[]> {
    const basiqUserId = requireUserId(ref);
    const rows = await collect<BasiqAccount>(`/users/${basiqUserId}/accounts`);

    return rows
      .filter((row) => !row.connection || row.connection.endsWith(ref.providerConnectionId))
      .map((row) => {
        const masked = maskedParts(row.accountNo);
        return {
          providerAccountId: row.id,
          name: row.name ?? row.class?.product ?? "Bank account",
          type: mapAccountType(row.class?.type),
          bsbLast3: masked.bsbLast3,
          accountLast4: masked.accountLast4,
          currency: row.currency ?? "AUD",
          ledgerBalanceCents:
            row.balance === undefined ? null : toCents(row.balance),
          availableBalanceCents:
            row.availableFunds === undefined ? null : toCents(row.availableFunds),
        };
      });
  },

  async listTransactions(ref, since): Promise<BankTransactionSnapshot[]> {
    const basiqUserId = requireUserId(ref);
    const filter = `transaction.postDate.gteq('${since}')`;
    const rows = await collect<BasiqTransaction>(
      `/users/${basiqUserId}/transactions?filter=${encodeURIComponent(filter)}&limit=500`,
      40,
    );

    const out: BankTransactionSnapshot[] = [];

    for (const row of rows) {
      const status = mapStatus(row.status);
      // A pending authorisation has no post date; its transaction date is when
      // the card was used, which is what belongs on the ledger.
      const occurredOn =
        isoDate(row.transactionDate) ?? isoDate(row.postDate) ?? todayIso();
      const amountCents = toCents(row.amount ?? "0");
      if (amountCents === 0) continue;

      out.push({
        providerTransactionId: row.id,
        providerAccountId: (row.account ?? "").split("/").pop() ?? "",
        amountCents,
        description: (row.description ?? "Bank transaction").slice(0, 200),
        merchant: row.enrich?.merchant?.businessName ?? null,
        occurredOn,
        clearedOn: status === "posted" ? isoDate(row.postDate) ?? occurredOn : null,
        status,
        providerCategory:
          row.enrich?.category?.anzsic?.class?.title ?? row.subClass?.title ?? null,
        raw: row,
      });
    }

    return out;
  },

  async refresh(ref): Promise<void> {
    const basiqUserId = requireUserId(ref);
    await call(`/users/${basiqUserId}/connections/${ref.providerConnectionId}/refresh`, {
      method: "POST",
    });
  },

  async revoke(ref): Promise<void> {
    const basiqUserId = requireUserId(ref);
    await call(`/users/${basiqUserId}/connections/${ref.providerConnectionId}`, {
      method: "DELETE",
    });
  },

  async verifyWebhook(request, rawBody): Promise<WebhookVerification> {
    const secret = process.env.BASIQ_WEBHOOK_SECRET;
    if (!secret) {
      return { ok: false, reason: "BASIQ_WEBHOOK_SECRET is not configured." };
    }

    const signature =
      request.headers.get("basiq-signature") ??
      request.headers.get("x-basiq-signature") ??
      "";
    if (!signature) return { ok: false, reason: "No signature header." };

    const expected = await hmacHex(secret, rawBody);
    if (!timingSafeEqual(signature.trim().toLowerCase(), expected)) {
      return { ok: false, reason: "Signature did not match." };
    }

    let payload: {
      eventId?: string;
      id?: string;
      eventTypeId?: string;
      type?: string;
      data?: { connectionId?: string; connection?: { id?: string }; entity?: string };
      links?: { connection?: string };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { ok: false, reason: "Body was not JSON." };
    }

    const connectionIds = [
      payload.data?.connectionId,
      payload.data?.connection?.id,
      payload.links?.connection?.split("/").pop(),
    ].filter((value): value is string => Boolean(value));

    return {
      ok: true,
      eventId: payload.eventId ?? payload.id ?? crypto.randomUUID(),
      type: payload.eventTypeId ?? payload.type ?? "unknown",
      providerConnectionIds: Array.from(new Set(connectionIds)),
      payload,
    };
  },
};

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
