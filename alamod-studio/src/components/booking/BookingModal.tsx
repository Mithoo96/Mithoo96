"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";
import { images } from "@/content/images";
import { StudioImage } from "@/components/ui/StudioImage";
import { LiveDot } from "@/components/ui/Waveform";

type Status = "idle" | "sending" | "sent" | "error";

const ease = [0.16, 1, 0.3, 1] as const;

export function BookingModal({ onClose, source }: { onClose: () => void; source: string }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const { provider, url } = site.booking;
  const embed = provider === "embed" && url;

  // Scroll lock, Escape to close, focus trap, focus restore.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const node = dialogRef.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !node) return;
      const focusables = node.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, iframe',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-stretch md:justify-end">
      <motion.button
        type="button"
        aria-label="Close booking"
        tabIndex={-1}
        className="absolute inset-0 bg-navy-900/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        onClick={onClose}
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-paper text-ink md:max-h-none md:w-[min(1080px,94vw)] md:flex-row md:rounded-none"
        initial={reduce ? false : { y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        {/* Visual side (desktop) */}
        <div className="relative hidden w-[38%] shrink-0 md:block">
          <StudioImage image={images.bandArea} sizes="420px" className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-navy/10" />
          <div className="absolute inset-x-8 bottom-10 text-paper">
            <p className="eyebrow flex items-center gap-2 text-paper/80">
              <LiveDot /> Session request
            </p>
            <p className="display mt-4 text-7xl">
              Book the
              <br />
              room.
            </p>
            <p className="mt-5 max-w-[26ch] text-sm text-paper/75">
              Sessions from ${site.startingRate}/hr. Rates and availability may vary.
            </p>
          </div>
        </div>

        {/* Content side */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4 md:px-10 md:py-6">
            <div>
              <p className="eyebrow text-red">ALAMOD Studio · Miami</p>
              <h2 id="booking-title" className="display-wide mt-1 text-xl md:text-2xl">
                {status === "sent" ? "Request received" : "Book a session"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-11 place-items-center rounded-full border border-ink/15 transition hover:border-red hover:text-red"
              aria-label="Close"
              data-autofocus={status === "sent" || embed ? "" : undefined}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6 md:px-10">
            {embed ? (
              <iframe
                src={url}
                title="Book a session at ALAMOD Studio"
                className="h-[70dvh] w-full border-0 md:h-full md:min-h-[640px]"
                loading="lazy"
              />
            ) : status === "sent" ? (
              <SentState onClose={onClose} />
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-2 gap-x-4 gap-y-5" noValidate={false}>
                <p className="col-span-2 -mt-1 text-sm text-ink/65">
                  Tell us when you want to play. ALAMOD will confirm availability and pricing before your session is
                  locked in.
                </p>
                <Field label="Name" className="col-span-2">
                  <input name="name" required autoComplete="name" className={input} data-autofocus />
                </Field>
                <Field label="Phone" className="col-span-2 sm:col-span-1">
                  <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" className={input} />
                </Field>
                <Field label="Email" className="col-span-2 sm:col-span-1">
                  <input name="email" type="email" required autoComplete="email" className={input} />
                </Field>
                <Field label="Preferred date">
                  <input name="date" type="date" required min={today} className={input} />
                </Field>
                <Field label="Preferred time">
                  <input name="time" type="time" required step={1800} className={input} />
                </Field>
                <Field label="Hours">
                  <select name="hours" required defaultValue="2" className={input}>
                    {Array.from({ length: site.booking.maxHours }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h} {h === 1 ? "hour" : "hours"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Musicians">
                  <select name="musicians" required defaultValue="4" className={input}>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Band / artist name" optional className="col-span-2">
                  <input name="artist" autoComplete="organization" className={input} />
                </Field>
                <Field label="Notes" optional className="col-span-2">
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Gear you're bringing, anything specific you need in the room…"
                    className={`${input} resize-none`}
                  />
                </Field>
                {/* Honeypot */}
                <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                {status === "error" && (
                  <p role="alert" className="col-span-2 border-l-2 border-red bg-red/5 px-4 py-3 text-sm">
                    {error} Please try again in a moment.
                  </p>
                )}

                <div className="col-span-2 mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink/55">Rates and availability may vary.</p>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="group inline-flex h-14 items-center justify-center gap-3 bg-red px-8 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Request session"}
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const input =
  "w-full h-12 border-0 border-b border-ink/20 bg-transparent px-0 text-base text-ink placeholder:text-ink/35 focus:border-red focus:outline-none focus:ring-0 [&:is(textarea)]:h-auto [&:is(textarea)]:py-2";

function Field({
  label,
  children,
  className = "col-span-1",
  optional,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="eyebrow flex justify-between text-ink/60">
        {label}
        {optional && <span className="text-ink/35">Optional</span>}
      </span>
      {children}
    </label>
  );
}

function SentState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-[50dvh] flex-col justify-center py-6">
      <p className="eyebrow flex items-center gap-2 text-red">
        <LiveDot /> Request sent
      </p>
      <p className="display mt-4 text-6xl md:text-8xl">
        You&rsquo;re
        <br />
        on the list.
      </p>
      <p className="mt-6 max-w-md text-ink/70">
        ALAMOD Studio will reach out to confirm your date, time and rate. Your session is confirmed once you hear back.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-10 inline-flex h-12 w-fit items-center border border-ink px-6 font-mono text-xs uppercase tracking-[0.2em] transition hover:border-red hover:text-red"
      >
        Back to the site
      </button>
    </div>
  );
}
