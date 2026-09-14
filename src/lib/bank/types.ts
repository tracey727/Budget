/**
 * The shape of bank data the app works with, independent of any one provider.
 *
 * Everything here is normalised before it reaches the sync engine: amounts are
 * signed integer cents (negative = money leaving the account), dates are
 * `YYYY-MM-DD` in Australian eastern time, and clearing status is reduced to
 * the three states the ledger recognises.
 */

export type ProviderKey = "basiq" | "sandbox";

/** How far a transaction has got at the bank. */
export type ClearingStatus = "pending" | "posted" | "declined";

export type BankInstitution = {
  id: string;
  name: string;
  /** 'bank' | 'creditCard' | 'super' | 'other' — used for grouping only. */
  category?: string;
  logoUrl?: string;
};

export type BankAccountSnapshot = {
  providerAccountId: string;
  name: string;
  /** 'transaction' | 'savings' | 'credit' | 'offset' | 'loan' | 'investment' */
  type: string;
  /** Masked, display only — never a full account number. */
  bsbLast3: string | null;
  accountLast4: string | null;
  currency: string;
  /**
   * The bank's settled figure, in cents. This is the balance the ledger is
   * reconciled against.
   */
  ledgerBalanceCents: number | null;
  /**
   * What the bank says is actually spendable right now, in cents — settled
   * money less pending authorisations, plus any arranged overdraft.
   */
  availableBalanceCents: number | null;
};

export type BankTransactionSnapshot = {
  providerTransactionId: string;
  providerAccountId: string;
  /** Signed cents. Negative is money out. */
  amountCents: number;
  description: string;
  merchant: string | null;
  /** Date the transaction happened, `YYYY-MM-DD`. */
  occurredOn: string;
  /** Date the bank settled it, `YYYY-MM-DD`. Null while pending. */
  clearedOn: string | null;
  status: ClearingStatus;
  /** The provider's own category hint, used only as a fallback. */
  providerCategory: string | null;
  /** Kept verbatim so a support question can be answered later. */
  raw?: unknown;
};

/**
 * How a stored link is addressed at the provider.
 *
 * Some providers (Basiq) scope every endpoint to their own user id and hand
 * out a separate connection id per institution, so both travel together.
 */
export type BankConnectionRef = {
  providerConnectionId: string;
  providerUserId: string | null;
};

/** Everything needed to hand a person off to the consent flow. */
export type ConsentSession = {
  /** Where to send the browser to authorise the connection. */
  url: string;
  /**
   * How to address the link afterwards. Until the person finishes at their
   * bank the connection id may be provisional — `finaliseConsent` replaces it
   * with the real one when they return.
   */
  ref: BankConnectionRef;
  expiresAt: Date | null;
};

export type ConnectionState = {
  status:
    | "pending"
    | "active"
    | "action_needed"
    | "expired"
    | "revoked"
    | "error";
  institutionId: string | null;
  institutionName: string | null;
  consentExpiresAt: Date | null;
  error: string | null;
};

export type WebhookVerification =
  | {
      ok: true;
      /** Provider event id, used to make delivery idempotent. */
      eventId: string;
      type: string;
      /** Connections this event concerns, if the payload names any. */
      providerConnectionIds: string[];
      payload: unknown;
    }
  | { ok: false; reason: string };

/**
 * A data recipient the app can pull from.
 *
 * Implementations must not throw for ordinary provider failures — they should
 * raise `BankProviderError` so the sync engine can record it against the
 * connection and keep going with the next one.
 */
export type BankProvider = {
  key: ProviderKey;
  /** Shown in the UI, e.g. "Basiq (CDR accredited)". */
  label: string;
  /** True when the provider has real credentials and is not a demonstration. */
  live: boolean;

  listInstitutions(): Promise<BankInstitution[]>;

  /** Starts a consent flow and returns where to send the person. */
  startConsent(input: {
    userId: string;
    email: string;
    fullName: string;
    institutionId?: string;
    returnUrl: string;
  }): Promise<ConsentSession>;

  /**
   * Called when the person returns from the consent screen. Resolves the
   * provisional handle into the connection the bank actually created.
   */
  finaliseConsent(
    ref: BankConnectionRef,
  ): Promise<{ ref: BankConnectionRef; state: ConnectionState }>;

  /** Current consent state, called after the person returns and on each sync. */
  getConnection(ref: BankConnectionRef): Promise<ConnectionState>;

  listAccounts(ref: BankConnectionRef): Promise<BankAccountSnapshot[]>;

  /**
   * Transactions on or after `since`, pending ones included.
   *
   * Providers are expected to return the full current picture for the window,
   * because the sync engine uses absence from the window to decide that a
   * pending authorisation was dropped by the bank.
   */
  listTransactions(
    ref: BankConnectionRef,
    since: string,
  ): Promise<BankTransactionSnapshot[]>;

  /** Asks the provider to re-poll the bank now. Optional. */
  refresh?(ref: BankConnectionRef): Promise<void>;

  /** Revokes consent at the provider. Best effort — local state wins. */
  revoke(ref: BankConnectionRef): Promise<void>;

  verifyWebhook(request: Request, rawBody: string): Promise<WebhookVerification>;
};

export class BankProviderError extends Error {
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(
    message: string,
    options: { retryable?: boolean; status?: number | null } = {},
  ) {
    super(message);
    this.name = "BankProviderError";
    this.retryable = options.retryable ?? false;
    this.status = options.status ?? null;
  }
}
