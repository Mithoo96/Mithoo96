import type { CommerceChannel } from "@/core/tenancy/modules";

export const commerceProviders = {
  SHOPIFY: { name: "Shopify", liveImplemented: false, planned: ["Secure store authorization", "Orders and products", "Fulfillment and tracking sync", "Customer/order context", "Signed webhooks", "Authorized returns/refunds"] },
  TIKTOK_SHOP: { name: "TikTok Shop", liveImplemented: false, planned: ["Official shop authorization", "Order synchronization", "Shipping deadlines", "Fulfillment and tracking", "Cancellation/refund risk", "Official API actions and signed webhooks"] },
} as const;
export function providerChannel(provider: string): CommerceChannel | null {
  if (provider === "TIKTOK_SHOP" || provider === "TIKTOK_SHOP_MOCK") return "TIKTOK_SHOP";
  if (provider === "SHOPIFY") return "SHOPIFY";
  return null;
}
export function commerceConnectionState(channel: CommerceChannel, rows: readonly { provider: string; status: string; is_mock: boolean }[]): "Not Connected" | "Connected" | "Needs Attention" {
  const real = rows.filter((r) => providerChannel(r.provider) === channel && !r.is_mock);
  if (real.some((r) => r.status === "ERROR" || r.status === "ACTIVE" && !commerceProviders[channel].liveImplemented)) return "Needs Attention";
  if (commerceProviders[channel].liveImplemented && real.some((r) => r.status === "ACTIVE")) return "Connected";
  return "Not Connected";
}
