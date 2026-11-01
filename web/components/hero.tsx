import { business } from "@/lib/mock";
import { Greeting } from "./greeting";

export function HeroGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden">
      <div className="orb orb-a left-[8%] top-[-120px] h-[380px] w-[380px] bg-[#c9d8ff] opacity-60" />
      <div className="orb orb-b left-[38%] top-[-60px] h-[320px] w-[420px] bg-[#ddd3ff] opacity-55" />
      <div className="orb orb-c right-[6%] top-[-100px] h-[340px] w-[340px] bg-[#f3e6cf] opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}

export function Hero() {
  return (
    <header className="relative pb-12 pt-16 md:pt-24">
      <p className="rise text-[15px] text-mute" style={{ animationDelay: "0ms" }}><Greeting name={business.owner} punctuation="." /></p>
      <h1
        className="rise mt-3 text-[44px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink md:text-[64px]"
        style={{ animationDelay: "120ms" }}
      >
        Your business is moving.
      </h1>
      <p className="rise mt-4 text-[19px] tracking-[-0.01em] text-ink-soft/80" style={{ animationDelay: "240ms" }}>
        Here’s what needs your attention.
      </p>
    </header>
  );
}
