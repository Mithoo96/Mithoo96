"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { images } from "@/content/images";
import { site } from "@/content/site";
import { StudioImage } from "@/components/ui/StudioImage";
import { LineReveal, Reveal } from "@/components/ui/Reveal";
import { BookButton } from "@/components/ui/BookButton";
import { LiveDot, Waveform } from "@/components/ui/Waveform";

export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-10%", "10%"]);

  return (
    <section ref={ref} data-hide-bookbar aria-labelledby="final-title" className="grain relative isolate overflow-hidden bg-navy">
      <motion.div className="absolute -inset-y-[12%] inset-x-0 -z-10" style={{ y }}>
        <StudioImage image={images.studioWide} sizes="100vw" className="absolute inset-0" />
        <div className="absolute inset-0 bg-navy/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-navy/70" />
      </motion.div>

      {/* Red accent: stage-light slash */}
      <div aria-hidden className="absolute right-[8%] top-0 -z-10 flex h-full skew-x-[-14deg] gap-3 md:right-[16%] md:gap-5">
        <span className="h-full w-2 bg-red md:w-3" />
        <span className="h-full w-px bg-red/60" />
      </div>

      <div className="mx-auto flex min-h-[64svh] max-w-[1600px] flex-col justify-center px-5 py-20 md:px-10">
        <Reveal>
          <p className="eyebrow flex items-center gap-2.5 text-paper/80">
            <LiveDot /> Now booking · {site.city}, {site.region}
          </p>
        </Reveal>
        <LineReveal
          id="final-title"
          className="display mt-8 text-[clamp(4rem,16vw,14rem)]"
          lines={["The room", "is ready.", <span key="b" className="text-red">Is your band?</span>]}
        />
        <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <Reveal delay={0.1}>
            <p className="max-w-md text-lg text-paper/85">Book your next rehearsal session at ALAMOD Studio in Miami.</p>
          </Reveal>
          <Reveal delay={0.15}>
            <BookButton source="final-cta" className="w-full md:w-auto" />
          </Reveal>
        </div>
        <Waveform bars={64} className="mt-10 hidden h-10 text-red/70 md:flex" barClassName="bg-current" />
      </div>
    </section>
  );
}
