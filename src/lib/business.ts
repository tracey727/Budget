/**
 * Business identity — the single source of truth for legal, payment and
 * contact details shown across the site.
 *
 * These values appear in the Terms, Privacy Policy, Subscription & Refund
 * Policy, contact page, the app and Revenue Rescue footers, the billing page
 * and the marketing footer. Change them here and every page follows.
 */

export const BUSINESS = {
  /**
   * The name the product is advertised and contracted under. Everything —
   * page titles, the logo, legal documents and account emails — reads from
   * here, so a rebrand is a one-line change.
   */
  appName: "ON TRACK Budget Rescue",
  /** The product line within the business. */
  productName: "Budget Rescue",
  /** What the app is, in one phrase — used in legal copy and metadata. */
  appDescriptor: "the budget rescue app for professionals and everyday people",
  /** Advertising line used on the landing page and in metadata. */
  tagline: "Take Control of Every Dollar",
  /** Legal operator: the person or entity that contracts with customers. */
  operator: "Tracey Ann Kennedy",
  abn: "36 530 564 761",
  postalAddress: "PO Box 475, Labrador QLD 4215, Australia",
  supportEmail: "tracey@genevieveapp.com.au",
  /** Privacy requests and complaints. */
  privacyEmail: "tracey@genevieveapp.com.au",
  /** Billing enquiries. */
  billingEmail: "tracey@genevieveapp.com.au",
  /** State whose laws govern the customer contract. */
  jurisdiction: "Queensland, Australia",
  /** Shown as "Last updated" on the legal pages. */
  legalUpdated: "31 August 2026",
  /**
   * Whether the business is registered for GST.
   *
   * Currently false: turnover is below the $75,000 ATO registration
   * threshold, so no GST is charged on subscriptions and prices are the total
   * payable. Flip this to true if you register, and the pricing wording across
   * the site changes with it.
   */
  gstRegistered: false,
} as const;

/**
 * The house brand both products are published under.
 *
 * The same legal operator and ABN in `BUSINESS` stands behind everything —
 * this is the name and mark customers see, not a separate legal person.
 */
export const COMPANY = {
  name: "ON TRACK by TRACE",
  /** The line that sits under the mark in the supplied artwork. */
  tagline: "Safety from Roots to every Journey.",
  /** The full lockup: tree, wordmark, tagline and roots. */
  logo: "/on-track-logo.png",
  /** Crown only, for headers and the browser tab where type is too small. */
  mark: "/on-track-mark.png",
  /**
   * Whether "ON TRACK by TRACE" is registered with ASIC as a business name
   * against the ABN above.
   *
   * While this is false the site says the products are operated by the named
   * person and ABN, which is accurate either way. Set it to true once the
   * business name registration is in place and the legal lines across the
   * site change to "trading as ON TRACK by TRACE".
   */
  registeredBusinessName: false,
} as const;

/** The products sold under the house brand. */
export const PRODUCTS = {
  budget: {
    name: BUSINESS.appName,
    descriptor: "Personal budgeting and bank reconciliation",
    href: "/app",
  },
  rescue: {
    name: "ON TRACK Revenue Rescue",
    descriptor: "Operational leakage detection",
    href: "/rescue",
  },
} as const;

/**
 * Payment processing facts shown wherever money is asked for.
 *
 * Australian Consumer Law expects the merchant, the currency, the tax
 * position and the recurring terms to be clear before payment, and the card
 * schemes expect the statement descriptor to be findable. Everything here is
 * displayed rather than buried, so keep it true to the Stripe account.
 */
export const PAYMENTS = {
  processor: "Stripe",
  /** The Stripe entity that contracts with Australian businesses. */
  processorEntity: "Stripe Payments Australia Pty Ltd",
  processorPrivacyUrl: "https://stripe.com/au/privacy",
  /**
   * The merchant of record — who the customer's contract for payment is with.
   * Stripe is the processor, not the seller.
   */
  merchantOfRecord: `${BUSINESS.operator}, ABN ${BUSINESS.abn}`,
  currency: "AUD",
  currencyLabel: "Australian dollars (AUD)",
  /**
   * What appears on a card statement.
   *
   * Must match the statement descriptor set in the Stripe Dashboard
   * (Settings → Business → Public details). 22 characters is the Stripe
   * ceiling.
   */
  statementDescriptor: "ONTRACK BY TRACE",
  /** Payment methods enabled on the Stripe account. */
  methods: [
    "Visa",
    "Mastercard",
    "American Express",
    "Apple Pay and Google Pay, where your device supports them",
  ],
  /** Where checkout and subscription management actually happen. */
  checkout: "Stripe Checkout",
  portal: "Stripe Customer Portal",
} as const;

/**
 * "Tracey Ann Kennedy trading as ON TRACK by TRACE, ABN 36 530 564 761"
 *
 * Both products under the house brand are attributed to the same operator
 * and ABN — there is no separate trading name per product any more, since
 * Budget Rescue and Revenue Rescue are branches of one house brand rather
 * than independently branded products. Use `companyEntityLine()` rather
 * than calling this directly.
 */
export function legalEntityLine(tradingName: string): string {
  return `${BUSINESS.operator} trading as ${tradingName}, ABN ${BUSINESS.abn}`;
}

/**
 * The operator line for anything published under the house brand.
 *
 * Until the business name is registered this names the operator and ABN
 * without claiming a trading name that ASIC has not issued.
 */
export function companyEntityLine(): string {
  return COMPANY.registeredBusinessName
    ? legalEntityLine(COMPANY.name)
    : `${BUSINESS.operator}, ABN ${BUSINESS.abn}`;
}

/**
 * The one sentence about tax that appears wherever prices are shown.
 *
 * An unregistered business must not imply a price includes GST, so the copy
 * follows the registration flag rather than hedging with "where applicable".
 */
export function taxNote(): string {
  return BUSINESS.gstRegistered
    ? "All prices are in Australian dollars and include GST."
    : "All prices are in Australian dollars. No GST is charged — the price shown is the total you pay.";
}

/** The one sentence about card handling that belongs beside any price. */
export function paymentNote(): string {
  return (
    `Payments are processed by ${PAYMENTS.processor}. ` +
    `Card details are entered on ${PAYMENTS.processor}'s hosted checkout and are never stored on our servers.`
  );
}
