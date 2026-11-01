"use client";

import { Check, Loader2, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white shadow-[0_8px_24px_-10px_rgba(10,10,30,0.5)] hover:-translate-y-px hover:shadow-[0_12px_28px_-10px_rgba(10,10,30,0.55)]",
  secondary: "bg-white text-ink ring-1 ring-hair hover:ring-[rgba(139,124,246,0.35)] hover:shadow-[0_6px_18px_-8px_rgba(139,124,246,0.45)]",
  ghost: "text-ink-soft hover:bg-[#f4f4f8] hover:text-ink",
  danger: "bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50",
  soft: "bg-[#f4f3fb] text-ink hover:bg-[#ecebf7]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]", md: "h-10 px-5 text-[14px]", lg: "h-12 px-6 text-[15px]", icon: "h-10 w-10", "icon-sm": "h-8 w-8",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean; done?: boolean; icon?: LucideIcon; iconRight?: LucideIcon; children?: ReactNode;
}

export function Button({ variant = "secondary", size = "md", loading, done, icon: Icon, iconRight: IconRight, children, className = "", disabled, ...rest }: ButtonProps) {
  const iconSize = size === "sm" || size === "icon-sm" ? 14 : 16;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-iris/20 ${variants[variant]} ${sizes[size]} ${done ? "!bg-emerald-600 !text-white !ring-0" : ""} ${className}`}
    >
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : done ? <Check size={iconSize} strokeWidth={2.2} /> : Icon ? <Icon size={iconSize} strokeWidth={1.8} /> : null}
      {children}
      {IconRight && !loading && !done && <IconRight size={iconSize} strokeWidth={1.8} />}
    </button>
  );
}

/** Simulates an async action: idle → loading → done → idle. */
export function useSimulated(delay = 1100, resetAfter = 1800) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const run = useCallback((onDone?: () => void) => {
    setStatus("loading");
    timers.current.push(window.setTimeout(() => {
      setStatus("done"); onDone?.();
      timers.current.push(window.setTimeout(() => setStatus("idle"), resetAfter));
    }, delay));
  }, [delay, resetAfter]);
  return { status, loading: status === "loading", done: status === "done", run };
}
