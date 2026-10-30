/**
 * Central business configuration for ALAMOD Studio.
 *
 * Anything left as `null` is intentionally unknown. Components hide or soften
 * the related UI instead of inventing details, so fill these in as the studio
 * confirms them.
 */

export type BookingProvider =
  /** Built-in request form that posts to /api/booking (optionally forwarded to a webhook). */
  | "form"
  /** Calendly / Acuity / GoHighLevel / Square / Google booking page embedded in the modal. */
  | "embed"
  /** Send visitors straight to an external booking page in a new tab. */
  | "link";

export const site = {
  name: "ALAMOD Studio",
  shortName: "ALAMOD",
  tagline: "Professional rehearsal space in Miami.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alamodstudio.com",
  city: "Miami",
  region: "FL",
  regionName: "Florida",
  country: "US",

  /** Shown as "Sessions from $60/hr". Keep phrasing as a starting rate. */
  startingRate: 60,
  currency: "USD",

  contact: {
    // TODO: add real contact details. While null, the UI shows only the booking form.
    phone: null as string | null,
    email: null as string | null,
    /** Street address. While null, the site just says "Miami, Florida". */
    streetAddress: null as string | null,
    postalCode: null as string | null,
    mapsUrl: null as string | null,
    hours: null as string | null,
  },

  /** Social links only render as active links when a URL is set. */
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
    tiktok: null as string | null,
    youtube: null as string | null,
  },

  booking: {
    provider: "form" as BookingProvider,
    /**
     * For "embed" or "link": the scheduler URL, e.g.
     * https://calendly.com/alamod/rehearsal
     * https://api.leadconnectorhq.com/widget/booking/XXXX (GoHighLevel)
     * https://app.acuityscheduling.com/schedule.php?owner=XXXX
     * https://book.squareup.com/appointments/XXXX
     * https://calendar.app.google/XXXX
     */
    url: null as string | null,
    maxHours: 8,
  },
} as const;

export const nav = [
  { label: "Studio", href: "#studio" },
  { label: "Equipment", href: "#equipment" },
  { label: "Gallery", href: "#gallery" },
  { label: "Rates", href: "#rates" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
] as const;
