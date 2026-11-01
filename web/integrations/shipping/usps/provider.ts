/**
 * USPS carrier adapter — NOT IMPLEMENTED (no credentials yet).
 * Implement with the official USPS APIs (OAuth client credentials) and map
 * USPS event codes to TrackingNormalizedStatus.
 */
import { DomainError } from "@/core/errors";
import { inferCarrierCandidates } from "@/core/shipping/tracking";
import type { CarrierProvider } from "../../types";

export class UspsCarrierProvider implements CarrierProvider {
  readonly carrier = "USPS";
  readonly isMock = false;
  validateTrackingNumber(trackingNumber: string): boolean {
    return inferCarrierCandidates(trackingNumber).includes("USPS");
  }
  async getTrackingEvents(): Promise<never> {
    throw new DomainError("INTEGRATION_NOT_CONFIGURED", "USPS tracking integration is not configured");
  }
}
