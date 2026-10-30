import { site } from "./site";

/** Answers intentionally avoid policies that haven't been confirmed (deposits, cancellations, minimums). */
export const faq: { q: string; a: string }[] = [
  {
    q: "What is included with the rehearsal studio rental?",
    a: "Your session includes time in a rehearsal room that's already set up with professional gear — PA system, stage monitors, a mixer, a drum kit, amplification and microphones. Need something specific? Contact the studio before booking to confirm.",
  },
  {
    q: "How much does a rehearsal session cost?",
    a: `Rehearsal sessions start from $${site.startingRate}/hr. Rates and availability may vary, so ALAMOD will confirm the rate for your session when you book.`,
  },
  {
    q: "Who can rent ALAMOD Studio?",
    a: "Bands, solo artists, vocalists, instrumentalists, producers, music directors, worship teams, touring musicians and small creative teams — anyone who needs a professional room to rehearse.",
  },
  {
    q: "Can a full band rehearse here?",
    a: "Yes. The room is set up for full-band rehearsals with a drum kit, amplification, a PA and monitors. If you're bringing a larger group, mention it in your booking request so the studio can confirm the space works for you.",
  },
  {
    q: "Do I need to bring my own equipment?",
    a: "Not the heavy stuff. The core backline and PA are already in the room. Most musicians bring their own instrument, plus anything personal like sticks, pedals or in-ear monitors. Contact the studio if you have a specific gear question.",
  },
  {
    q: "How far in advance should I book?",
    a: "Sessions are booked based on availability, so the earlier you request your time, the better your chances of getting it. Contact ALAMOD for current openings.",
  },
  {
    q: "Can I book multiple hours?",
    a: "Yes. Sessions are booked by the hour — choose how many hours you need when you send your request.",
  },
  {
    q: "Where is ALAMOD Studio located?",
    a: site.contact.streetAddress
      ? `ALAMOD Studio is located at ${site.contact.streetAddress}, ${site.city}, ${site.region}.`
      : "ALAMOD Studio is in Miami, Florida. The exact address is shared when your session is confirmed — or contact the studio to ask.",
  },
];
