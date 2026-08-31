/**
 * Business identity — the single source of truth for legal and contact
 * details shown across the site.
 *
 * These values appear in the Terms, Privacy Policy, Subscription & Refund
 * Policy, contact page and footer. Change them here and every page follows.
 */

export const BUSINESS = {
  /** Product name as advertised. */
  appName: "Gen Money",
  /** What the app is, in one phrase — used in legal copy and metadata. */
  appDescriptor: "the travellers budget",
  /** Legal operator: the person or entity that contracts with customers. */
  operator: "Tracey Ann Kennedy",
  /** Registered trading name. */
  tradingName: "Genevieve App",
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

/** "Tracey Ann Kennedy trading as Genevieve App, ABN 36 530 564 761" */
export function legalEntityLine(): string {
  return `${BUSINESS.operator} trading as ${BUSINESS.tradingName}, ABN ${BUSINESS.abn}`;
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
