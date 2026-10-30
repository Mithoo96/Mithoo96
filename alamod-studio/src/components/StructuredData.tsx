import { site } from "@/content/site";
import { faq } from "@/content/faq";
import { images } from "@/content/images";

/** LocalBusiness + FAQPage JSON-LD. Only includes details that are configured in site.ts. */
export function StructuredData() {
  const { contact, social } = site;
  const sameAs = Object.values(social).filter(Boolean);

  const business = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${site.url}/#business`,
    name: site.name,
    description:
      "Fully equipped music rehearsal studio in Miami for bands, musicians, singers and performers. Hourly rehearsal sessions.",
    url: site.url,
    image: [`${site.url}${images.hero.src}`, `${site.url}/og-image.jpg`],
    logo: `${site.url}/icon.svg`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: site.city,
      addressRegion: site.region,
      addressCountry: site.country,
      ...(contact.streetAddress && { streetAddress: contact.streetAddress }),
      ...(contact.postalCode && { postalCode: contact.postalCode }),
    },
    areaServed: { "@type": "City", name: "Miami" },
    ...(contact.phone && { telephone: contact.phone }),
    ...(contact.email && { email: contact.email }),
    ...(sameAs.length && { sameAs }),
    makesOffer: {
      "@type": "Offer",
      name: "Hourly rehearsal studio session",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        minPrice: site.startingRate,
        priceCurrency: site.currency,
        unitCode: "HUR",
        unitText: "hour",
      },
    },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(business) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
    </>
  );
}
