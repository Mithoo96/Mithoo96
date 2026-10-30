"use client";

import { useEffect, useState } from "react";
import { useBooking } from "@/components/booking/BookingProvider";
import { site } from "@/content/site";

/**
 * Thumb-reach booking bar on phones. Appears after the hero and hides while
 * a section with its own primary CTA ([data-hide-bookbar]) is on screen.
 */
export function MobileBookBar() {
  const [pastHero, setPastHero] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const { open, isOpen } = useBooking();

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
        setSuppressed(visible.size > 0);
      },
      { threshold: 0.25 },
    );
    document.querySelectorAll("[data-hide-bookbar]").forEach((el) => io.observe(el));
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const show = pastHero && !suppressed && !isOpen;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] md:hidden ${
        show ? "translate-y-0" : "translate-y-[140%]"
      }`}
      aria-hidden={!show}
    >
      <div className="flex items-stretch overflow-hidden border border-paper/10 bg-navy/90 shadow-[0_-10px_40px_rgba(0,0,0,.35)] backdrop-blur-xl">
        <div className="flex flex-1 flex-col justify-center px-4">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-paper/70">Sessions from</span>
          <span className="display-wide text-lg leading-tight">${site.startingRate}/hr</span>
        </div>
        <button
          type="button"
          tabIndex={show ? 0 : -1}
          onClick={() => open("mobile-bar")}
          className="flex h-14 items-center gap-2 bg-red-600 px-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white"
        >
          Book now <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
