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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.occurredOn),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_batch_idx").on(t.importBatchId),
    uniqueIndex("transactions_dedupe_unique").on(t.userId, t.dedupeHash),
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
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
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

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
