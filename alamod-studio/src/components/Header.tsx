"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { BookButton } from "@/components/ui/BookButton";
import { useBooking } from "@/components/booking/BookingProvider";
import { nav, site } from "@/content/site";

const ease = [0.16, 1, 0.3, 1] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { open } = useBooking();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-red focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled || menuOpen
            ? "border-b border-paper/10 bg-navy/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 md:h-20 md:px-10">
          <a href="#top" aria-label="ALAMOD Studio home" className="relative z-10 block" onClick={() => setMenuOpen(false)}>
            <Logo className="h-7 w-auto md:h-9" />
          </a>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="group relative font-mono text-[0.72rem] uppercase tracking-[0.2em] text-paper/75 transition hover:text-paper"
                  >
                    {item.label}
                    <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-red transition-all duration-300 group-hover:w-full" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <BookButton size="sm" source="header" />
            </div>
            <button
              type="button"
              className="relative z-10 grid size-11 place-items-center lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="relative block h-3 w-7">
                <span
                  className={`absolute left-0 h-[2px] w-full bg-paper transition-transform duration-300 ${
                    menuOpen ? "top-[5px] rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 h-[2px] bg-red transition-all duration-300 ${
                    menuOpen ? "top-[5px] w-full -rotate-45 bg-paper" : "top-[10px] w-4"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 flex flex-col bg-navy pt-20 lg:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease }}
          >
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5">
              <ul className="border-t border-paper/10">
                {nav.map((item, i) => (
                  <motion.li
                    key={item.href}
                    className="border-b border-paper/10"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease, delay: 0.15 + i * 0.05 }}
                  >
                    <a
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-baseline justify-between py-4"
                    >
                      <span className="display text-[13vw] leading-none sm:text-7xl">{item.label}</span>
                      <span className="font-mono text-xs text-paper/40">{String(i + 1).padStart(2, "0")}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-paper/10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <p className="eyebrow mb-4 text-paper/50">
                {site.city}, {site.regionName} · Sessions from ${site.startingRate}/hr
              </p>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  open("mobile-menu");
                }}
                className="flex h-16 w-full items-center justify-center gap-3 bg-red font-mono text-sm font-semibold uppercase tracking-[0.2em] text-white"
              >
                Book a session <span aria-hidden>→</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
