/**
 * Client testimonials. Only add real quotes from real clients, with their
 * permission. While every entry is a placeholder, the section renders as an
 * obvious developer placeholder (see Testimonials.tsx) — set
 * `showTestimonialPlaceholders` to false to hide it entirely before launch.
 */
export type Testimonial = {
  quote: string;
  name: string;
  role?: string;
  placeholder?: boolean;
};

export const showTestimonialPlaceholders = true;

export const testimonials: Testimonial[] = [
  { quote: "[REAL CLIENT TESTIMONIAL]", name: "[CLIENT NAME]", role: "[BAND / ARTIST]", placeholder: true },
  { quote: "[REAL CLIENT TESTIMONIAL]", name: "[CLIENT NAME]", role: "[BAND / ARTIST]", placeholder: true },
  { quote: "[REAL CLIENT TESTIMONIAL]", name: "[CLIENT NAME]", role: "[BAND / ARTIST]", placeholder: true },
];
