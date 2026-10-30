"use client";

import type { ReactNode } from "react";
import { useBooking } from "@/components/booking/BookingProvider";

type Variant = "solid" | "ghost" | "ink";

const styles: Record<Variant, string> = {
  solid: "bg-red-600 text-white hover:bg-red-700",
  ghost: "border border-paper/35 text-paper hover:border-paper hover:bg-paper hover:text-navy",
  ink: "border border-ink text-ink hover:bg-ink hover:text-paper",
};

export const buttonBase =
  "group relative inline-flex items-center justify-center gap-3 overflow-hidden font-mono text-[0.78rem] font-semibold uppercase tracking-[0.18em] transition-colors duration-300";

export function ButtonInner({ children }: { children: ReactNode }) {
  return (
    <>
      <span>{children}</span>
      <span aria-hidden className="inline-block transition-transform duration-300 group-hover:translate-x-1">
        →
      </span>
    </>
  );
}

export function BookButton({
  children = "Book a session",
  variant = "solid",
  size = "lg",
  source,
  className = "",
}: {
  children?: ReactNode;
  variant?: Variant;
  size?: "sm" | "lg";
  source?: string;
  className?: string;
}) {
  const { open } = useBooking();
  const sizing = size === "lg" ? "h-14 px-8" : "h-11 px-5";
  return (
    <button
      type="button"
      onClick={() => open(source)}
      className={`${buttonBase} ${styles[variant]} ${sizing} ${className}`}
    >
      <ButtonInner>{children}</ButtonInner>
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "ghost",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <a href={href} className={`${buttonBase} ${styles[variant]} h-14 px-8 ${className}`}>
      <ButtonInner>{children}</ButtonInner>
    </a>
  );
}
