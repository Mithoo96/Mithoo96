"use client";

import { useId } from "react";

function scale(data: number[], w: number, h: number, pad = 4) {
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  return data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, pad + (1 - (v - min) / span) * (h - pad * 2)] as const);
}
const line = (pts: readonly (readonly [number, number])[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

export function Sparkline({ data, height = 44, positive = true }: { data: number[]; height?: number; positive?: boolean }) {
  const id = useId(); const w = 200;
  const pts = scale(data, w, height);
  const last = pts[pts.length - 1];
  const color = positive ? "#8b7cf6" : "#c4a167";
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-11 w-full overflow-visible" aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line(pts)} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line(pts)} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="#fff" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Larger area chart with a faint grid and labelled y-axis. */
export function AreaChart({ data, labels, format }: { data: number[]; labels: string[]; format: (n: number) => string }) {
  const id = useId();
  const W = 720, H = 240, L = 56, B = 26, T = 10;
  const raw = Math.max(...data) * 1.05 || 1;
  const mag = 10 ** Math.floor(Math.log10(raw / 4));
  const stepSize = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => raw / s <= 4) ?? 10 * mag;
  const max = stepSize * 4;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const x = (i: number) => L + (i / Math.max(1, data.length - 1)) * (W - L - 8);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const step = Math.ceil(labels.length / 7);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label="Trend chart">
        <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b7cf6" stopOpacity=".2" /><stop offset="1" stopColor="#8b7cf6" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 8} y1={y(t)} y2={y(t)} stroke="rgba(15,15,30,0.06)" />
            <text x={L - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8a8a96">{format(t)}</text>
          </g>
        ))}
        <path d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id})`} />
        <path d={path} fill="none" stroke="#8b7cf6" strokeWidth="2" strokeLinejoin="round" />
        {data.map((v, i) => i === data.length - 1 && <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke="#8b7cf6" strokeWidth="2" />)}
        {labels.map((l, i) => i % step === 0 && <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#8a8a96">{l}</text>)}
      </svg>
    </div>
  );
}

export function ShareBars({ items }: { items: { label: string; share: number }[] }) {
  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1.5 flex justify-between text-[14px]"><span className="text-ink-soft">{i.label}</span><span className="font-medium tabular-nums">{i.share}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f1f5]"><div className="h-full rounded-full bg-gradient-to-r from-sky to-iris" style={{ width: `${i.share}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
