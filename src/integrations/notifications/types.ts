/**
 * Notification provider abstraction. Core business logic only ever calls the
 * notification service; it never knows which vendor delivers EMAIL/SMS/etc.
 * Providers are registered per channel in ./registry.ts.
 */
export const NOTIFICATION_CHANNELS = ["IN_APP", "EMAIL", "SMS", "WHATSAPP", "PUSH"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface OutboundNotification {
  readonly id: string;
  readonly organizationId: string;
  readonly recipient: { readonly userId: string; readonly email: string | null; readonly phone: string | null };
  readonly channel: NotificationChannel;
  readonly title: string;
  readonly body: string | null;
  readonly actionUrl: string | null;
}

export type DeliveryResult =
  | { readonly status: "SENT"; readonly providerMessageId?: string }
  | { readonly status: "FAILED"; readonly error: string; readonly retryable: boolean }
  | { readonly status: "SKIPPED"; readonly reason: string };

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  readonly name: string;
  send(message: OutboundNotification): Promise<DeliveryResult>;
}
