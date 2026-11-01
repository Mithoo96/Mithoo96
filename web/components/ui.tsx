import type { ReactNode } from "react";

export function GlassCard({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`glass rise relative rounded-[28px] ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-mute">{children}</p>;
}
