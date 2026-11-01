/**
 * ⚠️ MOCK carrier provider — returns only events explicitly simulated via
 * `simulate()`. With no simulation it returns no events, so nothing is ever
 * reported as carrier-accepted without (mock) carrier data.
 */
import type { CarrierProvider, PlatformTracking } from "../../types";
import { normalizeTracking } from "@/core/shipping/tracking";

export class MockCarrierProvider implements CarrierProvider {
  readonly isMock = true;
  private readonly events = new Map<string, PlatformTracking["events"][number][]>();
  constructor(readonly carrier: string = "MOCK") {}
  validateTrackingNumber(trackingNumber: string): boolean {
    return (normalizeTracking(trackingNumber)?.length ?? 0) >= 8;
  }
  simulate(trackingNumber: string, events: PlatformTracking["events"][number][]): void {
    const key = normalizeTracking(trackingNumber);
    if (key) this.events.set(key, [...(this.events.get(key) ?? []), ...events]);
  }
  async getTrackingEvents(trackingNumber: string): Promise<PlatformTracking["events"]> {
    return this.events.get(normalizeTracking(trackingNumber) ?? "") ?? [];
  }
}
