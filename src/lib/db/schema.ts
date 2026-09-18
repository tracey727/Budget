import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/*                                   Users                                    */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    // Australian state/territory — used for public-holiday and payroll hints.
    state: text("state"),
    // 'starter' | 'personal' | 'professional'
    plan: text("plan").notNull().default("starter"),
    // 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
    planStatus: text("plan_status").notNull().default("none"),
    planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
    stripeCustomerId: text("stripe_customer_id"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_stripe_customer_idx").on(t.stripeCustomerId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/**
 * Single-use password reset tokens.
 *
 * Only the SHA-256 hash of the token is stored, so a database copy cannot be
 * used to reset anyone's password. Rows are consumed on use and expire after
 * a short window.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("password_reset_user_idx").on(t.userId)],
);

/**
 * Single-use email verification tokens.
 *
 * Same handling as password resets: only the hash is stored, the row is
 * consumed on use, and it expires. The window is longer because a person may
 * not check email straight away.
 */
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The address being proved, so changing email invalidates the token. */
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_verification_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/*                             Bank connections                               */
/* -------------------------------------------------------------------------- */

/**
 * One consented link to a financial institution.
 *
 * The app never sees or stores bank credentials. A CDR-accredited data
 * recipient (Basiq in production) holds the consent and hands back an opaque
 * connection id, which is all that is kept here. Consents expire — Australian
 * CDR consent runs for at most 12 months — so `consentExpiresAt` is tracked
 * and surfaced before data stops arriving.
 */
export const bankConnections = pgTable(
  "bank_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 'basiq' | 'sandbox' — which data recipient holds the consent. */
    provider: text("provider").notNull(),
    /** The provider's id for the consented connection. Never a credential. */
    providerConnectionId: text("provider_connection_id").notNull(),
    /** The provider's id for the person, where it differs from ours. */
    providerUserId: text("provider_user_id"),
    institutionId: text("institution_id"),
    institutionName: text("institution_name").notNull(),
    /**
     * 'pending'      — consent started, not yet confirmed by the bank.
     * 'active'       — data is flowing.
     * 'action_needed'— the bank wants the person to re-authenticate (MFA).
     * 'expired'      — consent has lapsed and must be given again.
     * 'revoked'      — the person disconnected it.
     * 'error'        — the provider reported a fault; `lastError` says what.
     */
    status: text("status").notNull().default("pending"),
    lastError: text("last_error"),
    consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    /** Oldest transaction date fetched, so backfills are not repeated. */
    backfilledFrom: date("backfilled_from"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bank_connections_user_idx").on(t.userId),
    uniqueIndex("bank_connections_provider_unique").on(
      t.provider,
      t.providerConnectionId,
    ),
  ],
);

/** One record per attempted refresh, so a person can see why data is stale. */
export const bankSyncRuns = pgTable(
  "bank_sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(() => bankConnections.id, {
      onDelete: "cascade",
    }),
    /** 'manual' | 'webhook' | 'schedule' | 'connect' */
    trigger: text("trigger").notNull().default("manual"),
    /** 'running' | 'ok' | 'error' */
    status: text("status").notNull().default("running"),
    accountsSynced: integer("accounts_synced").notNull().default(0),
    added: integer("added").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    /** Pending rows that settled during this run — the headline number. */
    cleared: integer("cleared").notNull().default(0),
    /** Authorisations the bank dropped without settling. */
    dropped: integer("dropped").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("bank_sync_runs_user_idx").on(t.userId, t.startedAt)],
);

/**
 * Provider webhook deliveries already applied.
 *
 * Like Stripe, open-banking providers retry, so the handler must be
 * idempotent. The primary key is the provider's event id.
 */
export const bankWebhookEvents = pgTable("bank_webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                                  Alerts                                    */
/* -------------------------------------------------------------------------- */

/**
 * Automated findings shown in the app and, when the person opts in, emailed.
 *
 * `dedupeKey` is unique per user so the same finding cannot be raised twice —
 * a scheduled sync that runs every hour must not produce an hourly copy of
 * "your rent cleared".
 */
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * 'transaction_cleared' | 'transaction_pending' | 'low_balance' |
     * 'budget_warning' | 'budget_exceeded' | 'bill_due' | 'large_transaction' |
     * 'connection_action' | 'sync_failed' | 'goal_reached'
     */
    kind: text("kind").notNull(),
    /** 'info' | 'warning' | 'critical' */
    severity: text("severity").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** In-app destination for the alert, e.g. /app/transactions. */
    href: text("href"),
    /** Signed amount in AUD where the alert is about money. */
    amount: numeric("amount", { precision: 14, scale: 2 }),
    dedupeKey: text("dedupe_key").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alerts_user_created_idx").on(t.userId, t.createdAt),
    uniqueIndex("alerts_dedupe_unique").on(t.userId, t.dedupeKey),
  ],
);

/* -------------------------------------------------------------------------- */
/*                             Categorisation rules                           */
/* -------------------------------------------------------------------------- */

/**
 * "Anything whose description contains WOOLWORTHS is Groceries."
 *
 * Rules run over bank and CSV rows as they arrive, so a linked account
 * categorises itself instead of leaving a person a fortnightly tidy-up.
 */
export const categoryRules = pgTable(
  "category_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Matched case-insensitively against description and merchant. */
    pattern: text("pattern").notNull(),
    /** 'contains' | 'starts_with' | 'equals' */
    matchType: text("match_type").notNull().default("contains"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** Optional tidy name to show instead of the bank's raw text. */
    renameTo: text("rename_to"),
    markBusiness: boolean("mark_business").notNull().default(false),
    /** Lower numbers win when several rules match. */
    priority: integer("priority").notNull().default(100),
    /** Times the rule has fired — shows which rules are earning their keep. */
    timesApplied: integer("times_applied").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("category_rules_user_idx").on(t.userId, t.priority)],
);

/* -------------------------------------------------------------------------- */
/*                                  Accounts                                  */
/* -------------------------------------------------------------------------- */

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // 'transaction' | 'savings' | 'credit' | 'offset' | 'super' | 'investment' | 'cash' | 'loan'
    type: text("type").notNull().default("transaction"),
    institution: text("institution"),
    // Australian BSB (6 digits) — stored masked, display only.
    bsbLast3: text("bsb_last3"),
    accountLast4: text("account_last4"),
    openingBalance: numeric("opening_balance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("AUD"),
    isBusiness: boolean("is_business").notNull().default(false),
    archived: boolean("archived").notNull().default(false),

    /* ----------------------------- Bank linkage ---------------------------- */

    /** Set when this account mirrors a real account at a connected bank. */
    connectionId: uuid("connection_id").references(() => bankConnections.id, {
      onDelete: "set null",
    }),
    /** The provider's own id for the account, unique within a connection. */
    providerAccountId: text("provider_account_id"),
    /**
     * Balances as the bank last reported them.
     *
     * `ledger` is the bank's posted/cleared figure; `available` already has
     * pending authorisations deducted. Banks disagree on which they show by
     * default, so both are kept and the app decides what to present.
     */
    ledgerBalance: numeric("ledger_balance", { precision: 14, scale: 2 }),
    availableBalance: numeric("available_balance", { precision: 14, scale: 2 }),
    balanceUpdatedAt: timestamp("balance_updated_at", { withTimezone: true }),
    /** Lets a person keep a linked account but stop pulling new data. */
    syncEnabled: boolean("sync_enabled").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    index("accounts_connection_idx").on(t.connectionId),
    uniqueIndex("accounts_provider_account_unique").on(
      t.connectionId,
      t.providerAccountId,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Categories                                 */
/* -------------------------------------------------------------------------- */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // 'income' | 'expense'
    kind: text("kind").notNull().default("expense"),
    // Broad grouping for reports: 'essentials' | 'lifestyle' | 'savings' | 'business' | 'income'
    bucket: text("bucket").notNull().default("lifestyle"),
    colour: text("colour").notNull().default("#10b981"),
    icon: text("icon"),
    // Business categories drive the Professional-tier GST/deduction reports.
    isDeductible: boolean("is_deductible").notNull().default(false),
    gstApplicable: boolean("gst_applicable").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [
    index("categories_user_idx").on(t.userId),
    uniqueIndex("categories_user_name_unique").on(t.userId, t.name),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                Transactions                                */
/* -------------------------------------------------------------------------- */

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    // Positive = money in, negative = money out. Always AUD minor-unit safe.
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    description: text("description").notNull(),
    merchant: text("merchant"),
    occurredOn: date("occurred_on").notNull(),
    notes: text("notes"),
    // GST component in AUD for business transactions (Professional tier).
    gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }),
    isBusiness: boolean("is_business").notNull().default(false),
    isReconciled: boolean("is_reconciled").notNull().default(false),
    // Set when the row came from a CSV import, so imports can be undone.
    importBatchId: uuid("import_batch_id"),
    // Deterministic hash of (account, date, amount, description) for dedupe.
    dedupeHash: text("dedupe_hash"),

    /* --------------------------- Clearing status --------------------------- */

    /**
     * 'pending'  — the bank has authorised it but not settled it. It reduces
     *              what is safe to spend, but not the cleared balance.
     * 'posted'   — settled by the bank, or entered by hand. Counts everywhere.
     * 'declined' — an authorisation the bank dropped without settling. Kept
     *              for the record, counted nowhere.
     */
    status: text("status").notNull().default("posted"),
    /** When the bank settled it. Null while pending. */
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
    /** When it was first seen as pending, so we can age stuck authorisations. */
    pendingSince: timestamp("pending_since", { withTimezone: true }),
    /** 'manual' | 'import' | 'bank' — where the row came from. */
    source: text("source").notNull().default("manual"),

    /* ---------------------------- Bank linkage ----------------------------- */

    connectionId: uuid("connection_id").references(() => bankConnections.id, {
      onDelete: "set null",
    }),
    /** The provider's id for this transaction. Unique per user. */
    providerTransactionId: text("provider_transaction_id"),
    /**
     * When a pending authorisation settles, some banks issue a brand new id
     * rather than updating the old row. The pending row is then folded into
     * the posted one and this records which authorisation it settled.
     */
    settledPendingId: text("settled_pending_id"),
    /** Raw provider payload, kept for support questions and re-parsing. */
    providerPayload: jsonb("provider_payload"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.occurredOn),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_batch_idx").on(t.importBatchId),
    index("transactions_status_idx").on(t.userId, t.status),
    uniqueIndex("transactions_dedupe_unique").on(t.userId, t.dedupeHash),
    uniqueIndex("transactions_provider_unique").on(
      t.userId,
      t.providerTransactionId,
    ),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Budgets                                   */
/* -------------------------------------------------------------------------- */

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    // First day of the budgeted month, e.g. 2026-07-01.
    periodStart: date("period_start").notNull(),
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    rollover: boolean("rollover").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("budgets_unique_period").on(t.userId, t.categoryId, t.periodStart),
    index("budgets_user_period_idx").on(t.userId, t.periodStart),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Goals                                    */
/* -------------------------------------------------------------------------- */

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
    savedAmount: numeric("saved_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    targetDate: date("target_date"),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    // 'emergency' | 'home' | 'travel' | 'vehicle' | 'debt' | 'other'
    kind: text("kind").notNull().default("other"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/*                              Recurring bills                               */
/* -------------------------------------------------------------------------- */

export const recurringBills = pgTable(
  "recurring_bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    // 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
    frequency: text("frequency").notNull().default("monthly"),
    nextDueOn: date("next_due_on").notNull(),
    autoPay: boolean("auto_pay").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recurring_bills_user_due_idx").on(t.userId, t.nextDueOn)],
);

/* -------------------------------------------------------------------------- */
/*                            Billing / Stripe state                          */
/* -------------------------------------------------------------------------- */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(), // Stripe subscription id
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    priceId: text("price_id").notNull(),
    productId: text("product_id"),
    planKey: text("plan_key").notNull(),
    // 'month' | 'year'
    interval: text("interval").notNull().default("month"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

/**
 * Every Stripe event id we have already applied. Stripe guarantees
 * at-least-once delivery, so the webhook must be idempotent.
 */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                                 Relations                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
  goals: many(goals),
  recurringBills: many(recurringBills),
  subscriptions: many(subscriptions),
  bankConnections: many(bankConnections),
  alerts: many(alerts),
  categoryRules: many(categoryRules),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  connection: one(bankConnections, {
    fields: [accounts.connectionId],
    references: [bankConnections.id],
  }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const bankConnectionsRelations = relations(
  bankConnections,
  ({ one, many }) => ({
    user: one(users, { fields: [bankConnections.userId], references: [users.id] }),
    accounts: many(accounts),
  }),
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type BankConnection = typeof bankConnections.$inferSelect;
export type BankSyncRun = typeof bankSyncRuns.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type CategoryRule = typeof categoryRules.$inferSelect;
