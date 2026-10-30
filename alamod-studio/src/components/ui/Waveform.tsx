/**
 * Minimal level-meter / waveform motif. Purely decorative.
 * Heights are deterministic so server and client markup match.
 */
export function Waveform({
  bars = 28,
  className = "",
  animated = true,
  barClassName = "bg-current",
}: {
  bars?: number;
  className?: string;
  animated?: boolean;
  barClassName?: string;
}) {
  return (
    <div aria-hidden className={`flex items-center gap-[3px] ${className}`}>
      {Array.from({ length: bars }, (_, i) => {
        const h = 22 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * 78);
        return (
          <span
            key={i}
            className={`block w-[2px] origin-center rounded-full ${barClassName} ${animated ? "animate-eq" : ""}`}
            style={{ height: `${h}%`, animationDelay: `${(i % 7) * -0.17}s`, animationDuration: `${0.9 + (i % 5) * 0.18}s` }}
          />
        );
      })}
    </div>
  );
}

/** Small blinking "REC"-style status dot. */
export function LiveDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-2 rounded-full bg-red animate-rec ${className}`} />;
}
