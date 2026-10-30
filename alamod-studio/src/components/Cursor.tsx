"use client";

import { useEffect, useRef } from "react";

/** Small red cursor accent for fine pointers. Disabled for touch + reduced motion. */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = dot.current;
    if (!fine || reduce || !el) return;

    let x = -100, y = -100, cx = x, cy = y, raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement | null;
      el.dataset.active = t?.closest("a,button,[role=button],[data-cursor]") ? "1" : "0";
      el.style.opacity = "1";
    };
    const leave = () => (el.style.opacity = "0");
    const tick = () => {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] hidden opacity-0 transition-opacity duration-300 [@media(pointer:fine)]:block"
    >
      <span className="-ml-1 -mt-1 block size-2 rounded-full bg-red mix-blend-screen transition-transform duration-300 ease-out [[data-active='1']_&]:scale-[3.5] [[data-active='1']_&]:opacity-60" />
    </div>
  );
}
