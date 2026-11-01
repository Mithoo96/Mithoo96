/**
 * Official TikTok Shop Open API adapter — NOT IMPLEMENTED.
 *
 * Implement against TikTok Shop Partner Center documentation once the
 * business has an approved app (app key/secret, shop authorization via OAuth).
 * Requirements for the implementer:
 *   * Use only the official API; no scraping, browser sessions or cookies.
 *   * Read the app secret / access tokens via integrationSecret(credentials_ref).
 *   * Implement TikTok's documented webhook signature scheme in verifyWebhook.
 *   * Map TikTok order/package statuses into ImportedOrder.platformStatus.
 */
import { DomainError } from "@/core/errors";
import type { CommerceChannelProvider } from "../types";

const notImplemented = (): never => {
  throw new DomainError("INTEGRATION_NOT_CONFIGURED", "The official TikTok Shop integration is not implemented yet");
};

export class OfficialTikTokShopProvider implements CommerceChannelProvider {
  readonly provider = "TIKTOK_SHOP";
  readonly channel = "TIKTOK_SHOP";
  readonly isMock = false;
  importOrders = async () => notImplemented();
  getOrder = async () => notImplemented();
  syncOrder = async () => notImplemented();
  getShippingDeadline = async () => notImplemented();
  getTracking = async () => notImplemented();
  updateTracking = async () => notImplemented();
  getPlatformIssues = async () => notImplemented();
  verifyWebhook = () => ({ valid: false as const, reason: "official TikTok Shop webhook verification not implemented" });
  parseWebhook = () => notImplemented();
}
