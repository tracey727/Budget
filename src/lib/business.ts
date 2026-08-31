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
  /** Legal operator: the person or entity that contracts with customers. */
  operator: "Tracey Ann Kennedy",
  /** Registered trading name. */
  tradingName: "GENEVIEVE App™",
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
} as const;

/** "Tracey Ann Kennedy trading as GENEVIEVE App™, ABN 36 530 564 761" */
export function legalEntityLine(): string {
  return `${BUSINESS.operator} trading as ${BUSINESS.tradingName}, ABN ${BUSINESS.abn}`;
}
