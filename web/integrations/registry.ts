/**
 * Provider registry: maps integration_connections.provider / carrier codes to
 * adapters. Adding a platform = adding an adapter + one line here.
 */
import { DomainError } from "@/core/errors";
import type { CarrierProvider, CommerceChannelProvider } from "./types";
import { MockTikTokShopProvider } from "./tiktok-shop/mock-provider";
import { OfficialTikTokShopProvider } from "./tiktok-shop/official-provider";
import { UspsCarrierProvider } from "./shipping/usps/provider";
import { OfficialShopifyProvider } from "./shopify/official-provider";

const commerceFactories: Record<string, () => CommerceChannelProvider> = {
  SHOPIFY: () => new OfficialShopifyProvider(),
  TIKTOK_SHOP_MOCK: () => new MockTikTokShopProvider(),
  TIKTOK_SHOP: () => new OfficialTikTokShopProvider(),
};

const carrierProviders = new Map<string, CarrierProvider>([["USPS", new UspsCarrierProvider()]]);

const overrides = new Map<string, CommerceChannelProvider>();

export function getCommerceProvider(provider: string): CommerceChannelProvider {
  const override = overrides.get(provider);
  if (override) return override;
  const factory = commerceFactories[provider];
  if (!factory) throw new DomainError("INTEGRATION_NOT_CONFIGURED", `Unknown commerce provider ${provider}`);
  return factory();
}

export function getCarrierProvider(carrier: string): CarrierProvider | null {
  return carrierProviders.get(carrier) ?? null;
}

/** Test/demo hooks. */
export function overrideCommerceProvider(provider: string, impl: CommerceChannelProvider | null): void {
  if (impl) overrides.set(provider, impl);
  else overrides.delete(provider);
}
export function registerCarrierProvider(provider: CarrierProvider): void {
  carrierProviders.set(provider.carrier, provider);
}
