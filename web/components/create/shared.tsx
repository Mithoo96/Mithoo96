"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, UploadCloud } from "lucide-react";
import { BrandIcon, brandName, type BrandKey } from "@/components/brand-icon";

export function WorkspaceHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 pb-8 pt-10 md:flex-row md:items-end md:justify-between md:pt-16">
      <div>
        <Link href="/create" className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-mute transition-colors hover:text-ink"><ArrowLeft size={14} />Create</Link>
        <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[44px]">{title}</h1>
        <p className="mt-2 text-[16px] text-ink-soft/80">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Toggleable publishing destinations, shown with their real brand marks. */
export function PlatformPicker({ options, value, onChange, notes }: { options: BrandKey[]; value: BrandKey[]; onChange: (v: BrandKey[]) => void; notes?: Partial<Record<BrandKey, string>> }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {options.map((b) => {
        const on = value.includes(b);
        return (
          <button key={b} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== b) : [...value, b])}
            className={`relative flex flex-col items-start gap-3 rounded-[20px] bg-white p-4 text-left ring-1 transition-all duration-300 ${on ? "ring-2 ring-ink shadow-[0_12px_30px_-16px_rgba(30,30,80,0.35)]" : "ring-hair hover:ring-[rgba(139,124,246,0.35)]"}`}>
            <BrandIcon brand={b} size="md" />
            <span><span className="block text-[14px] font-medium">{brandName(b)}</span>{notes?.[b] && <span className="block text-[12px] text-mute">{notes[b]}</span>}</span>
            <span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full transition-all ${on ? "bg-ink" : "ring-1 ring-hair"}`}>{on && <Check size={12} strokeWidth={2.6} className="text-white" />}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Dropzone({ accept, label, hint, onFile }: { accept: string; label: string; hint: string; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null); const [over, setOver] = useState(false);
  return (
    <div role="button" tabIndex={0} onClick={() => ref.current?.click()} onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed px-6 py-16 text-center transition-all duration-300 md:py-24 ${over ? "border-iris bg-[#f6f4ff]" : "border-[rgba(15,15,30,0.14)] bg-white/60 hover:border-iris/50 hover:bg-white"}`}>
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-40 w-2/3 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#dfe7ff] via-[#ece6ff] to-[#f6ecda] opacity-50 blur-3xl" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-white ring-1 ring-hair shadow-[0_8px_24px_-12px_rgba(30,30,80,0.25)]"><UploadCloud size={24} strokeWidth={1.5} className="text-iris" /></span>
      <p className="relative mt-5 text-[22px] font-semibold tracking-[-0.025em]">{label}</p>
      <p className="relative mt-1.5 text-[14px] text-mute">{hint}</p>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

export function Steps({ steps, current, onJump }: { steps: string[]; current: number; onJump: (i: number) => void }) {
  return (
    <ol className="no-scrollbar mb-6 flex gap-1 overflow-x-auto">
      {steps.map((s, i) => (
        <li key={s} className="shrink-0">
          <button onClick={() => i <= current && onJump(i)} disabled={i > current}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition-all ${i === current ? "bg-ink text-white" : i < current ? "text-ink hover:bg-[#f4f4f8]" : "text-mute"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${i === current ? "bg-white/20" : i < current ? "bg-[#f1effc] text-iris" : "ring-1 ring-hair"}`}>{i < current ? <Check size={11} strokeWidth={2.6} /> : i + 1}</span>{s}
          </button>
        </li>
      ))}
    </ol>
  );
}

export function OptionCard({ active, onClick, title, body, icon }: { active: boolean; onClick: () => void; title: string; body?: string; icon?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex items-start gap-3 rounded-[20px] bg-white p-4 text-left ring-1 transition-all duration-300 ${active ? "ring-2 ring-ink shadow-[0_12px_30px_-16px_rgba(30,30,80,0.35)]" : "ring-hair hover:ring-[rgba(139,124,246,0.35)]"}`}>
      {icon}<span><span className="block text-[15px] font-medium">{title}</span>{body && <span className="mt-0.5 block text-[13px] text-mute">{body}</span>}</span>
    </button>
  );
}

/** Deterministic soft gradient used as a stand-in for generated imagery. */
export function mockArt(seed: string, i = 0) {
  let h = i * 47; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `radial-gradient(120% 90% at ${20 + (h % 60)}% ${10 + (h % 40)}%, hsl(${h} 80% 88%), transparent 60%), radial-gradient(90% 80% at 80% 90%, hsl(${(h + 60) % 360} 70% 85%), transparent 60%), linear-gradient(135deg, hsl(${(h + 200) % 360} 60% 94%), hsl(${(h + 30) % 360} 55% 90%))`;
}
