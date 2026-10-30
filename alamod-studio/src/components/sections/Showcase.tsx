"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { gallery, images, type StudioImage as Img } from "@/content/images";
import { StudioImage } from "@/components/ui/StudioImage";
import { ImageReveal, LineReveal, Reveal } from "@/components/ui/Reveal";

const ease = [0.16, 1, 0.3, 1] as const;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function Tile({ image, onOpen, className = "", sizes }: { image: Img; onOpen: () => void; className?: string; sizes: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open photo: ${image.alt}`}
      className={`group relative block w-full overflow-hidden ${className}`}
      data-cursor
    >
      <StudioImage
        image={image}
        sizes={sizes}
        className="absolute inset-0"
        imgClassName="transition-[scale] duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]"
      />
      <span className="pointer-events-none absolute inset-0 bg-navy/0 transition-colors duration-500 group-hover:bg-navy/15" />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 right-3 grid size-10 place-items-center bg-paper text-navy opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M1 5V1h4M13 9v4H9M9 1h4v4M5 13H1V9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
    </button>
  );
}

export function Showcase() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const openAt = useCallback((img: Img) => setLightbox(Math.max(0, gallery.indexOf(img))), []);

  return (
    <section id="gallery" aria-labelledby="gallery-title" className="relative bg-navy">
      <div className="mx-auto max-w-[1600px] px-5 pt-24 md:px-10 md:pt-36">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Reveal>
              <p className="eyebrow text-red">The space</p>
            </Reveal>
            <LineReveal
              id="gallery-title"
              className="display mt-6 text-[clamp(3.6rem,15vw,11rem)]"
              lines={["Step inside", <span key="a">ALAMOD<span className="text-red">.</span></span>]}
            />
          </div>
          <Reveal delay={0.1} className="max-w-xs text-paper/65 md:pb-4">
            <p>Blue light overhead, red carpet underfoot, and a full backline set up on stage.</p>
          </Reveal>
        </div>

        {/* Editorial composition */}
        <div className="relative mt-14 grid grid-cols-12 gap-3 md:mt-20 md:gap-6">
          <ImageReveal className="col-span-12 md:col-span-8">
            <Tile image={images.bandArea} onOpen={() => openAt(images.bandArea)} sizes="(min-width: 768px) 66vw, 100vw" className="aspect-[16/10]" />
          </ImageReveal>
          <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-4 md:flex md:flex-col md:gap-6 md:pt-24">
            <ImageReveal delay={0.15}>
              <Tile image={images.congas} onOpen={() => openAt(images.congas)} sizes="(min-width: 768px) 30vw, 50vw" className="aspect-[4/5] md:aspect-[4/3]" />
            </ImageReveal>
            <ImageReveal delay={0.3} className="md:-ml-32 md:w-[calc(100%+8rem)] md:border-[8px] md:border-navy">
              <Tile image={images.sign} onOpen={() => openAt(images.sign)} sizes="(min-width: 768px) 36vw, 50vw" className="aspect-[4/5] md:aspect-[16/10]" />
            </ImageReveal>
          </div>
        </div>
      </div>

      <HorizontalStrip onOpen={setLightbox} />

      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

/** Desktop: vertical scroll drives a horizontal film strip. Mobile: native swipe with snap. */
function HorizontalStrip({ onOpen }: { onOpen: (i: number) => void }) {
  const reduce = useReducedMotion();
  const [pinned, setPinned] = useState(false);

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setPinned(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduce]);

  const strip = gallery.map((img, i) => (
    <figure
      key={i}
      className={`relative shrink-0 snap-start ${
        i % 3 === 1 ? "w-[78vw] md:w-[30vw]" : "w-[86vw] md:w-[44vw]"
      } ${pinned && i % 2 ? "mt-24" : ""}`}
    >
      <Tile
        image={img}
        onOpen={() => onOpen(i)}
        sizes="(min-width: 900px) 44vw, 86vw"
        className={i % 3 === 1 ? "aspect-[4/5]" : "aspect-[3/2]"}
      />
      <figcaption className="mt-3 flex justify-between gap-4 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-paper/45">
        <span>{String(i + 1).padStart(2, "0")}</span>
        <span className="truncate text-right">{img.alt.split(/[:,]/)[0]}</span>
      </figcaption>
    </figure>
  ));

  if (pinned) return <PinnedStrip>{strip}</PinnedStrip>;

  return (
    <div className="pb-24 pt-14 md:pb-36">
      <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 md:gap-6 md:px-10">
        {strip}
        <span aria-hidden className="w-2 shrink-0" />
      </div>
      <p className="eyebrow mt-6 px-5 text-paper/40 md:px-10">Swipe →</p>
    </div>
  );
}

function PinnedStrip({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useIsoLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={outer} style={{ height: `calc(100vh + ${distance}px)` }} className="relative mt-16">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <motion.div ref={track} style={{ x }} className="flex w-max items-start gap-6 pl-10 pr-[8vw]">
          {children}
          <div className="flex w-[30vw] shrink-0 flex-col justify-center self-center pl-10">
            <p className="display text-7xl">
              The room
              <br />
              <span className="text-red">is ready.</span>
            </p>
          </div>
        </motion.div>
        <div className="absolute inset-x-10 bottom-10 flex items-center gap-6">
          <span className="eyebrow text-paper/40">Scroll</span>
          <div className="relative h-px flex-1 bg-paper/15">
            <motion.span style={{ width: progress }} className="absolute inset-y-0 left-0 bg-red" />
          </div>
          <span className="eyebrow text-paper/40">{String(gallery.length).padStart(2, "0")} frames</span>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ index, onChange, onClose }: { index: number; onChange: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const total = gallery.length;
  const go = useCallback((d: number) => onChange((index + d + total) % total), [index, onChange, total]);
  const image = gallery[index];

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [go, onClose]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Studio photo viewer"
      className="fixed inset-0 z-[85] flex flex-col bg-navy-900/97 backdrop-blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between px-5 py-4 md:px-10 md:py-6">
        <p className="font-mono text-xs tracking-[0.2em] text-paper/60">
          <span className="text-paper">{String(index + 1).padStart(2, "0")}</span> / {String(total).padStart(2, "0")}
        </p>
        <button
          type="button"
          data-close
          onClick={onClose}
          className="grid size-11 place-items-center rounded-full border border-paper/20 transition hover:border-red hover:text-red"
          aria-label="Close photo viewer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-3 md:px-24">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className="relative aspect-[3/2] w-full max-w-[min(1400px,calc((100dvh-11rem)*1.5))] touch-pan-y"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
          >
            <StudioImage image={image} sizes="(min-width: 768px) 85vw, 100vw" className="absolute inset-0" />
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous photo"
          className="absolute left-6 top-1/2 hidden size-14 -translate-y-1/2 place-items-center border border-paper/20 transition hover:border-red hover:bg-red md:grid"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next photo"
          className="absolute right-6 top-1/2 hidden size-14 -translate-y-1/2 place-items-center border border-paper/20 transition hover:border-red hover:bg-red md:grid"
        >
          →
        </button>
      </div>

      <div className="flex items-center justify-between gap-6 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 md:px-10 md:pb-8">
        <p className="max-w-2xl text-sm text-paper/70">{image.alt}</p>
        <div className="flex gap-2 md:hidden">
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="grid size-12 place-items-center border border-paper/20">
            ←
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="grid size-12 place-items-center border border-paper/20">
            →
          </button>
        </div>
      </div>
    </motion.div>
  );
}
