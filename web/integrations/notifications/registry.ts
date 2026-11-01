/**
 * Channel → provider registry. Tonight only IN_APP exists (the database row IS
 * the in-app notification). Register EMAIL/SMS/WHATSAPP/PUSH providers here
 * (e.g. Resend, Twilio, Meta WhatsApp Cloud API, Expo/FCM) without touching
 * business logic.
 */
import type { NotificationChannel, NotificationProvider } from "./types";

const providers = new Map<NotificationChannel, NotificationProvider>();

export function registerNotificationProvider(provider: NotificationProvider): void {
  providers.set(provider.channel, provider);
}

export function getNotificationProvider(channel: NotificationChannel): NotificationProvider | null {
  return providers.get(channel) ?? null;
}

export function clearNotificationProviders(): void {
  providers.clear();
}
