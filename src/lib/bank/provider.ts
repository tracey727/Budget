/**
 * Chooses which data recipient to use.
 *
 * Basiq takes over as soon as `BASIQ_API_KEY` is present. Until then the demo
 * bank is used, so a fresh deployment can be connected, synced and reconciled
 * end to end before anyone signs a CDR agreement. The provider key is stored
 * on every connection, so switching providers later leaves existing links
 * pointing at the provider that created them.
 */

import { basiqProvider } from "./basiq";
import { sandboxProvider } from "./sandbox";
import type { BankProvider, ProviderKey } from "./types";

const PROVIDERS: Record<ProviderKey, BankProvider> = {
  basiq: basiqProvider,
  sandbox: sandboxProvider,
};

/** True when a real, accredited data recipient is configured. */
export function bankLive(): boolean {
  return Boolean(process.env.BASIQ_API_KEY);
}

/** The provider new connections should be made with. */
export function activeProviderKey(): ProviderKey {
  return bankLive() ? "basiq" : "sandbox";
}

export function activeProvider(): BankProvider {
  return PROVIDERS[activeProviderKey()];
}

/** The provider a stored connection was made with. */
export function providerFor(key: string): BankProvider {
  return PROVIDERS[key as ProviderKey] ?? sandboxProvider;
}

export { PROVIDERS };
