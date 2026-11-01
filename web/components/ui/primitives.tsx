"use client";

import { ChevronDown, Search, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { initials } from "@/lib/format";

/* ---------- Layout ---------- */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`relative mx-auto w-full ${wide ? "max-w-[1320px]" : "max-w-[1080px]"} px-5 pb-10 md:px-12`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions, eyebrow, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; back?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 pb-8 pt-10 md:flex-row md:items-end md:justify-between md:pt-16">
      <div className="min-w-0">
        {back}
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] [text-wrap:balance] md:text-[44px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[16px] tracking-[-0.01em] text-ink-soft/80">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ children, className = "", onClick, as = "section" }: { children: ReactNode; className?: string; onClick?: () => void; as?: "section" | "button" | "div" }) {
  const Tag = as;
  return <Tag onClick={onClick} className={`glass relative rounded-[24px] text-left ${onClick ? "cursor-pointer transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(40,40,110,0.16)]" : ""} ${className}`}>{children}</Tag>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Status ---------- */
export type Tone = "green" | "amber" | "rose" | "blue" | "violet" | "gray";
const toneClass: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  blue: "bg-sky-50 text-sky-700 ring-sky-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  gray: "bg-[#f4f4f7] text-ink-soft ring-hair",
};
const dotClass: Record<Tone, string> = { green: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", blue: "bg-sky-500", violet: "bg-violet-500", gray: "bg-[#a3a3ad]" };

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ${toneClass[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]}`} />{children}
    </span>
  );
}

/* ---------- Identity ---------- */
const avatarTints = ["from-[#e6edff] to-[#f1ecff]", "from-[#f6eedd] to-[#fbf5ea]", "from-[#efe9ff] to-[#f7f4ff]", "from-[#e3f3ee] to-[#f1f8f5]", "from-[#fde9ef] to-[#fdf3f6]"];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const tint = avatarTints[(name.charCodeAt(0) + name.length) % avatarTints.length];
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.36 }} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tint} font-semibold tracking-[-0.02em] text-ink-soft ring-1 ring-hair`}>
      {initials(name)}
    </span>
  );
}

/* ---------- Navigation-ish ---------- */
export function Segmented<T extends string>({ options, value, onChange, className = "" }: { options: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-[#f4f4f8] p-1 ring-1 ring-hair ${className}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-300 ${value === o.value ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,16,40,0.06),0_4px_12px_-6px_rgba(30,30,80,0.18)]" : "text-mute hover:text-ink"}`}>
          {o.label}
          {o.count !== undefined && <span className={`tabular-nums ${value === o.value ? "text-mute" : "text-mute/70"}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-hair px-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={`relative shrink-0 px-3 pb-3 pt-1 text-[14px] transition-colors ${value === t.value ? "font-medium text-ink" : "text-mute hover:text-ink"}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 text-mute tabular-nums">{t.count}</span>}
          <span className={`absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-ink transition-opacity ${value === t.value ? "opacity-100" : "opacity-0"}`} />
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair"><Icon size={20} strokeWidth={1.6} className="text-mute" /></span>
      <p className="mt-4 text-[15px] font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[14px] text-mute">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Forms ---------- */
const fieldBase = "w-full rounded-2xl bg-white px-4 text-[14px] text-ink ring-1 ring-hair transition-shadow placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-iris/30";
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-mute">{hint}</span>}
    </label>
  );
}
export const Input = ({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${fieldBase} h-11 ${className}`} />;
export const Textarea = ({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${fieldBase} min-h-[110px] resize-y py-3 leading-relaxed ${className}`} />;
export function Select({ className = "", children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...p} className={`${fieldBase} h-11 appearance-none pr-10 ${className}`}>{children}</select>
      <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-mute" />
    </span>
  );
}
export function SearchField({ value, onChange, placeholder = "Search", className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <span className={`relative block ${className}`}>
      <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className={`${fieldBase} h-11 rounded-full pl-11`} />
    </span>
  );
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-300 ${checked ? "bg-ink" : "bg-[#e4e4ea]"}`}>
      <span className={`absolute h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-300 ${checked ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
    </button>
  );
}
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium ring-1 transition-all duration-300 ${active ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-hair hover:text-ink hover:ring-[rgba(139,124,246,0.35)]"}`}>
      {children}
    </button>
  );
}

/* ---------- Menus & hints ---------- */
export function Menu({ trigger, items, align = "right" }: { trigger: ReactNode; items: { label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean }[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className={`pop-in absolute z-40 mt-2 min-w-[200px] rounded-2xl bg-white p-1.5 shadow-[0_20px_50px_-15px_rgba(30,30,80,0.3)] ring-1 ring-hair ${align === "right" ? "right-0" : "left-0"}`}>
          {items.map((it) => (
            <button key={it.label} onClick={() => { it.onClick(); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] transition-colors hover:bg-[#f4f4f8] ${it.danger ? "text-rose-600" : "text-ink"}`}>
              {it.icon && <it.icon size={15} strokeWidth={1.7} className={it.danger ? "" : "text-mute"} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] text-white opacity-0 transition-all duration-200 group-hover/tt:translate-y-0 group-hover/tt:opacity-100">
        {label}
      </span>
    </span>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-hair rounded-2xl ring-1 ring-hair">
      {items.map((i) => (
        <div key={i.label} className="flex items-center justify-between gap-4 px-4 py-3 text-[14px]">
          <dt className="text-mute">{i.label}</dt><dd className="text-right font-medium">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
