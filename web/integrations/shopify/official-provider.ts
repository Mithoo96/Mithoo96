import { DomainError } from "@/core/errors";
import type { CommerceChannelProvider } from "../types";
const unavailable = (): never => { throw new DomainError("INTEGRATION_NOT_CONFIGURED", "Shopify live connection is not enabled. Official OAuth and API implementation is required."); };

/** Official Shopify boundary. No HTTP, OAuth, scraping, credentials or fake success responses. */
export class OfficialShopifyProvider implements CommerceChannelProvider {
  readonly provider = "SHOPIFY";
  readonly channel = "SHOPIFY";
  readonly isMock = false;
  importOrders = async () => unavailable();
  getOrder = async () => unavailable();
  syncOrder = async () => unavailable();
  getShippingDeadline = async () => unavailable();
  getTracking = async () => unavailable();
  updateTracking = async () => unavailable();
  getPlatformIssues = async () => unavailable();
  getProducts = async () => unavailable();
  getFulfillment = async () => unavailable();
  getReturns = async () => unavailable();
  requestRefund = async () => unavailable();
  verifyWebhook = () => ({ valid: false as const, reason: "Official Shopify webhook verification is not implemented" });
  parseWebhook = () => unavailable();
}
