"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { images, type StudioImage as Img } from "@/content/images";
import { StudioImage } from "@/components/ui/StudioImage";
import { LineReveal, Reveal } from "@/components/ui/Reveal";

const reasons: { title: string; body: string; image: Img }[] = [
  {
    title: "Fully equipped",
    body: "Professional rehearsal equipment is already waiting for your session.",
    image: images.amps,
  },
  {
    title: "Built for musicians",
    body: "A dedicated environment designed specifically for artists, bands, and performers.",
    image: images.drums,
  },
  {
    title: "Hourly sessions",
    body: "Book the time you need without committing to a long-term studio rental.",
    image: images.studioWide,
  },
  {
    title: "Miami location",
    body: "A convenient rehearsal destination for South Florida musicians.",
    image: images.sign,
  },
  {
    title: "Plug in & play",
    body: "Spend less time setting up and more time rehearsing.",
    image: images.mixer,
  },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function WhyAlamod() {
  const [active, setActive] = useState(0);

  return (
    <section aria-labelledby="why-title" className="relative bg-navy">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow text-red">Why ALAMOD</p>
            </Reveal>
            <LineReveal
              id="why-title"
              className="display mt-6 text-[clamp(3.4rem,13vw,9.5rem)]"
              lines={["Less hauling.", <span key="m" className="outline-text text-paper">More playing.</span>]}
            />
          </div>
          <Reveal delay={0.1} className="max-w-sm text-paper/70 md:pb-3">
            <p>Everything about the room is set up so your band can walk in and get straight to the set list.</p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-12">
          {/* Sticky image (desktop) */}
          <div className="hidden md:col-span-5 md:block">
            <div className="sticky top-28 aspect-[4/5] overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={active}
                  className="absolute inset-0"
                  initial={{ clipPath: "inset(100% 0 0 0)" }}
                  animate={{ clipPath: "inset(0% 0 0 0)" }}
                  exit={{ opacity: 0.6 }}
                  transition={{ duration: 0.9, ease }}
                >
                  <StudioImage image={reasons[active].image} sizes="40vw" className="absolute inset-0" />
                </motion.div>
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-navy/80 to-transparent p-6">
                <span className="display text-8xl text-paper/90">{String(active + 1).padStart(2, "0")}</span>
                <span className="eyebrow text-paper/70">/ 05</span>
              </div>
            </div>
          </div>

          {/* List */}
          <ol className="md:col-span-7 md:col-start-6 border-t border-paper/12">
            {reasons.map((r, i) => (
              <li key={r.title} className="border-b border-paper/12">
                <Reveal delay={i * 0.04}>
                  <motion.div
                    onViewportEnter={() => setActive(i)}
                    viewport={{ margin: "-45% 0px -45% 0px" }}
                    tabIndex={0}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className="group grid grid-cols-[3rem_1fr] items-start gap-x-4 py-7 outline-none md:grid-cols-[4.5rem_1fr_auto] md:py-10"
                    data-cursor
                  >
                    <span
                      className={`font-mono text-sm transition-colors duration-300 ${
                        active === i ? "text-red" : "text-paper/60"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3
                        className={`display text-[clamp(2.6rem,10vw,5.5rem)] transition-colors duration-300 ${
                          active === i ? "text-paper" : "text-paper/75 md:text-paper/65"
                        } group-hover:text-paper`}
                      >
                        {r.title}
                      </h3>
                      <p className="mt-3 max-w-md text-paper/70">{r.body}</p>
                      {/* Inline image on mobile */}
                      <div className="relative mt-5 aspect-[16/9] md:hidden">
                        <StudioImage image={r.image} sizes="90vw" className="absolute inset-0" />
                      </div>
                    </div>
                    <span
                      aria-hidden
                      className={`hidden h-px self-center bg-red transition-all duration-500 md:block ${
                        active === i ? "w-16" : "w-0"
                      }`}
                    />
                  </motion.div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
