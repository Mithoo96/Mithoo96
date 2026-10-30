"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { images } from "@/content/images";
import { site } from "@/content/site";
import { StudioImage } from "@/components/ui/StudioImage";
import { LineReveal } from "@/components/ui/Reveal";
import { BookButton, LinkButton } from "@/components/ui/BookButton";
import { LiveDot, Waveform } from "@/components/ui/Waveform";

const ease = [0.16, 1, 0.3, 1] as const;

/** Running session clock — a small nod to a rehearsal timer. */
function SessionClock() {
  const [t, setT] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const id = setInterval(() => setT(Math.floor((performance.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [reduce]);
  const hh = String(Math.floor(t / 3600)).padStart(2, "0");
  const mm = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return (
    <span className="tabular-nums" aria-hidden>
      {hh}:{mm}:{ss}
    </span>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);

  return (
    <section
      id="top"
      ref={ref}
      aria-label="ALAMOD Studio, music rehearsal studio in Miami"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-navy"
    >
      {/* Photo */}
      <motion.div className="absolute inset-0 -z-10" style={{ y }}>
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.18 }}
          animate={{ scale: 1.04 }}
          transition={{ duration: 2.8, ease }}
        >
          <StudioImage
            image={images.hero}
            priority
            sizes="100vw"
            className="absolute inset-0"
            imgClassName="hidden md:block"
          />
          {/* Mobile crop focuses on the kit + sign */}
          <StudioImage
            image={images.hero}
            priority
            sizes="100vw"
            position="50% 58%"
            className="absolute inset-0 md:hidden"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/25 to-navy/30" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-navy/80 via-navy/15 to-transparent md:block" />
      </motion.div>

      {/* Top meta row */}
      <div className="mx-auto mt-24 flex w-full max-w-[1600px] items-center justify-between px-5 md:mt-32 md:px-10">
        <motion.p
          className="eyebrow flex items-center gap-2.5 text-paper/80"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
        >
          <LiveDot /> {site.tagline}
        </motion.p>
        <motion.p
          className="eyebrow hidden items-center gap-3 text-paper/70 md:flex"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          <span>Session</span> <SessionClock />
        </motion.p>
      </div>

      {/* Headline block */}
      <motion.div
        style={{ opacity: fade }}
        className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-end px-5 pb-8 md:px-10 md:pb-14"
      >
        <LineReveal
          as="h1"
          animateOnMount
          delay={0.25}
          className="display text-[clamp(3rem,13.6vw,13.5rem)] md:text-[clamp(6rem,10.5vw,13.5rem)]"
          lines={[
            "Your sound.",
            "Your space.",
            <>
              Your session<span className="text-red">.</span>
            </>,
          ]}
        />
        <span className="sr-only"> — Music and band rehearsal studio in Miami.</span>

        <div className="mt-7 grid gap-7 md:mt-10 md:grid-cols-12 md:items-end">
          <motion.p
            className="max-w-md text-[1.05rem] leading-relaxed text-paper/85 md:col-span-5 md:text-lg"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 1, ease }}
          >
            Miami&rsquo;s fully equipped rehearsal space built for bands, musicians, artists, and performers who are
            ready to make noise.
          </motion.p>

          <motion.div
            className="flex flex-col gap-3 sm:flex-row md:col-span-7 md:justify-end"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 1, ease }}
          >
            <BookButton source="hero" className="w-full sm:w-auto" />
            <LinkButton href="#studio" className="w-full sm:w-auto">
              Explore the studio
            </LinkButton>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom rail */}
      <div className="relative border-t border-paper/15">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-6 px-5 md:h-16 md:px-10">
          <p className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.2em]">
            <span className="bg-red-600 px-2 py-1 font-semibold text-white">Sessions from ${site.startingRate}/hr</span>
            <span className="hidden text-paper/70 sm:inline">Hourly · Fully equipped</span>
          </p>
          <Waveform bars={40} className="hidden h-6 flex-1 text-paper/60 md:flex md:max-w-md" />
          <a href="#studio" className="eyebrow flex items-center gap-2 text-paper/70 transition hover:text-paper">
            Scroll
            <span aria-hidden className="relative block h-5 w-px overflow-hidden bg-paper/20">
              <span className="absolute inset-x-0 top-0 h-2 animate-[scrollcue_1.8s_ease-in-out_infinite] bg-red" />
            </span>
          </a>
        </div>
      </div>
      <style>{`@keyframes scrollcue{0%{transform:translateY(-100%)}100%{transform:translateY(250%)}}`}</style>
    </section>
  );
}
