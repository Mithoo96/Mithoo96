import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/content/site";
import { BookingProvider } from "@/components/booking/BookingProvider";

const title = "ALAMOD Studio | Music & Band Rehearsal Studio in Miami";
const description =
  "Book a fully equipped rehearsal space for bands, musicians, singers and performers at ALAMOD Studio in Miami. Hourly rehearsal sessions available.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title,
  description,
  keywords: [
    "music rehearsal studio Miami",
    "band rehearsal space Miami",
    "rehearsal room Miami",
    "music practice space Miami",
    "band practice studio Miami",
    "hourly rehearsal studio Miami",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title,
    description,
    locale: "en_US",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ALAMOD Studio — rehearsal space in Miami" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#001235",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BookingProvider>{children}</BookingProvider>
      </body>
    </html>
  );
}
