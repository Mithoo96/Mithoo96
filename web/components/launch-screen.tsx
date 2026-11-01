"use client";

import { useEffect, useState } from "react";
import { Greeting } from "./greeting";
import { user, launch } from "@/lib/mock";
import { LAUNCH_KEY } from "@/lib/greeting";



// Timeline (ms). Text sequence finishes ~2.2s, holds, then hands off to the dashboard.
const EXIT_AT = 4700;
const EXIT_DURATION = 1400;

export function LaunchScreen() {
  const [phase, setPhase] = useState<"idle" | "intro" | "leaving" | "done">("idle");

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("launching")) return setPhase("done");
    try { localStorage.setItem(LAUNCH_KEY, new Date().toDateString()); } catch {}
    setPhase("intro");

    let doneTimer: number | undefined;
    const leave = () => {
      setPhase("leaving");
      root.classList.remove("launching"); // dashboard entrance animations start here
      doneTimer = window.setTimeout(() => setPhase("done"), EXIT_DURATION);
    };
    const exitTimer = window.setTimeout(leave, EXIT_AT);
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape" && e.key !== "Enter") return;
      window.clearTimeout(exitTimer);
      window.removeEventListener("keydown", skip);
      leave();
    };
    window.addEventListener("keydown", skip);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(doneTimer); window.removeEventListener("keydown", skip); };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`launch ${phase === "leaving" ? "is-leaving" : ""}`}
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))}
      role="presentation"
    >
      <div aria-hidden className="launch-glow">
        <div className="orb orb-a launch-orb left-[12%] top-[14%] h-[520px] w-[520px] bg-[#c9d8ff] opacity-60" />
        <div className="orb orb-b launch-orb left-[34%] top-[26%] h-[480px] w-[640px] bg-[#ddd3ff] opacity-55" />
        <div className="orb orb-c launch-orb right-[10%] top-[18%] h-[500px] w-[500px] bg-[#f3e6cf] opacity-70" />
      </div>

      <div className="launch-copy relative px-6 text-center">
        <p className="launch-in text-[17px] tracking-[-0.01em] text-mute" style={{ animationDelay: "300ms" }}>
          <Greeting name={user.name} emoji />
        </p>
        <h1
          className="launch-up mt-4 text-[52px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink [text-wrap:balance] md:text-[88px]"
          style={{ animationDelay: "800ms" }}
        >
          Your Business Is Moving.
        </h1>
        <p className="launch-in mt-5 text-[19px] tracking-[-0.01em] text-ink-soft/80 md:text-[21px]" style={{ animationDelay: "1500ms" }}>
          {launch.subtitle}
        </p>
        <p className="launch-in mt-12 inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-[15px] text-ink-soft glass" style={{ animationDelay: "2200ms" }}>
          <span className="pulse-dot h-2 w-2 rounded-full bg-gradient-to-br from-sky to-iris" />
          <span><span className="font-semibold text-ink">{launch.handledCount} things</span> handled while you were away.</span>
        </p>
      </div>
    </div>
  );
}
