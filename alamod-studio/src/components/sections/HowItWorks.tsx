"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { LineReveal, Reveal } from "@/components/ui/Reveal";

const steps = [
  { title: "Choose your time", body: "Select your preferred rehearsal date and session duration.", mark: "00:00" },
  { title: "Reserve your session", body: "Submit your booking request or complete your reservation.", mark: "00:30" },
  { title: "Show up & play", body: "Arrive at the studio and focus on your rehearsal.", mark: "01:00" },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section aria-labelledby="how-title" className="relative bg-navy-800">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-32">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow text-red">How it works</p>
            </Reveal>
            <LineReveal id="how-title" className="display mt-6 text-[clamp(3rem,11vw,7.5rem)]" lines={["Three steps.", "Then it's loud."]} />
          </div>
        </div>

        <div ref={ref} className="relative mt-16 md:mt-24">
          {/* Timeline: vertical on mobile, horizontal on desktop */}
          <div aria-hidden className="absolute bottom-0 left-[7px] top-0 w-px bg-paper/15 md:bottom-auto md:left-0 md:right-0 md:top-[7px] md:h-px md:w-auto">
            <motion.span style={{ height: fill }} className="absolute left-0 top-0 w-px bg-red md:hidden" />
            <motion.span style={{ width: fill }} className="absolute left-0 top-0 hidden h-px bg-red md:block" />
          </div>
          <ol className="grid gap-14 md:grid-cols-3 md:gap-10">
            {steps.map((s, i) => (
              <li key={s.title} className="relative pl-10 md:pl-0 md:pt-14">
                <span aria-hidden className="absolute left-0 top-1 size-[15px] border-2 border-red bg-navy-800 md:top-0" />
                <Reveal delay={i * 0.12}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="display text-7xl text-paper md:text-8xl">{String(i + 1).padStart(2, "0")}</span>
                    <span className="font-mono text-xs text-paper/60">{s.mark}</span>
                  </div>
                  <h3 className="display-wide mt-5 text-2xl md:text-3xl">{s.title}</h3>
                  <p className="mt-3 max-w-xs text-paper/75">{s.body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
