# ALAMOD Studio — website

Marketing site for ALAMOD Studio, an hourly music rehearsal studio in Miami.
Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 and Framer Motion.

```bash
npm install
npm run dev       # http://localhost:3000
npm run build && npm start
```

## Before launch checklist

1. **Photos**: the four studio photos are installed (see below). Swap or add more any time.
2. **Fill in `src/content/site.ts`**: phone, email, address, maps link, hours and social URLs.
   Anything left `null` is hidden or phrased generically. Nothing is invented.
3. **Connect booking** (see below). In production, the built-in form refuses requests
   until `BOOKING_WEBHOOK_URL` is set, so visitors are never told a request went through when it didn't.
4. **Testimonials**: add real quotes in `src/content/testimonials.ts`, or set
   `showTestimonialPlaceholders = false` to hide the section.
5. Set `NEXT_PUBLIC_SITE_URL` to the live domain (canonical URL, Open Graph, sitemap, JSON-LD).

## Photos

The site is art-directed around four studio photos. Save them as JPGs with these exact names in
`public/images/alamod/` (currently installed). To swap one, replace the file with the same name:

| File | Photo |
| --- | --- |
| `alamod-hero.jpg` | Wide room shot with the lit "ALAMOD MUSIC LLC" sign, blue LED ceiling, drums center |
| `studio-wide.jpg` | Wide shot from the right: PDP kit, red congas, wedges, digital mixer far right |
| `equipment.jpg` | Close shot of the sign above the Ampeg B4R + Hartke HA2500 bass heads |
| `band-area.jpg` | Drummer's-eye view over the Sabian cymbals toward the red sofa and JBL PA |

All detail crops (drums, congas, mixer, amps, ceiling and so on) are cut from those same four files in
`src/content/images.ts` using a focal point (`position`) and `zoom`. Tweak those values after
dropping in the photos to fine-tune each crop. To add more photos, add a file and an entry there.

Then regenerate the Open Graph image from the real hero:

```bash
npm run placeholders   # skips existing photos, rebuilds public/og-image.jpg
```

## Booking

`src/content/site.ts` → `booking.provider`:

- `"form"` (default): built-in request form → `POST /api/booking`, forwarded as JSON to
  `BOOKING_WEBHOOK_URL`. That can be a GoHighLevel inbound webhook, Zapier, Make, n8n or your own backend.
  Fields: name, phone, email, date, time, hours, musicians, band/artist name, notes, plus `source`
  (which button was used).
- `"embed"`: set `booking.url` to a Calendly / Acuity / GoHighLevel calendar / Square Appointments /
  Google appointment page and it loads inside the booking modal.
- `"link"`: every "Book" button opens `booking.url` in a new tab.

Every booking button goes through `useBooking().open()` (`src/components/booking/BookingProvider.tsx`),
so switching providers is a one-line change.

## Structure

```
src/
  app/            layout (SEO metadata), page, api/booking, robots, sitemap, icon
  content/        site config, images, FAQ, testimonials: edit copy and data here
  components/
    sections/     Hero, Intro, WhyAlamod, Equipment, Showcase, WhoFor, Rates,
                  HowItWorks, Testimonials, Faq, FinalCta
    booking/      BookingProvider + BookingModal
    ui/           Logo, StudioImage, Reveal, BookButton, Waveform
```

The logo lives in `public/brand/`: `alamod-logo.png` is the original and `alamod-logo-light.png` has the
navy letters switched to white for dark backgrounds. `components/ui/Logo.tsx` picks the right one.

Animations respect `prefers-reduced-motion`. The equipment list in `Equipment.tsx` only names brands
visible in the studio photos; keep it in sync with what's actually in the room.
