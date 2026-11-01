"use client";

import { useEffect, useState } from "react";
import { Greeting } from "./greeting";
import { useWorkspace } from "@/components/shell/workspace";



// Timeline (ms): greeting → headline → summary lines → closing line (~4.4s), hold ~2.5s, then hand off.
const EXIT_AT = 7000;
const EXIT_DURATION = 1400;

/** Fire this to play the welcome again (e.g. after signing back in). */
export const replayLaunch = () => window.dispatchEvent(new Event("mithoo:replay-launch"));

export function LaunchScreen() {
  const { profile } = useWorkspace();
  const launch = { subtitle: "Your workspace is ready.", items: [profile.organization.name, profile.viewer.role], closing: "Let’s see what needs your attention." };
  const [phase, setPhase] = useState<"idle" | "intro" | "leaving" | "done">("idle");
  const [run, setRun] = useState(0);

  // Replays: re-arm the pre-paint flag and restart the sequence.
  useEffect(() => {
    const replay = () => { document.documentElement.classList.add("launching"); setPhase("idle"); setRun((r) => r + 1); };
    window.addEventListener("mithoo:replay-launch", replay);
    return () => window.removeEventListener("mithoo:replay-launch", replay);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("launching")) return setPhase("done");
    setPhase("intro");

    let doneTimer: number | undefined;
    const leave = () => {
      setPhase("leaving");
      root.classList.remove("launching"); // dashboard entrance animations start here
      window.dispatchEvent(new Event("mithoo:launch-done"));
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
  }, [run]);

  if (phase === "done") return null;

  return (
    <div
      key={run}
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
          <Greeting name={profile.viewer.firstName ?? "there"} emoji />
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
        <ul className="mx-auto mt-10 grid max-w-[560px] gap-2.5 text-left sm:grid-cols-2">
          {launch.items.map((item, i) => (
            <li key={item} className="launch-in glass flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-ink-soft" style={{ animationDelay: `${2100 + i * 380}ms` }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-sky to-iris" />
              <span><span className="font-semibold text-ink">{item.split(" ")[0]}</span> {item.split(" ").slice(1).join(" ")}</span>
            </li>
          ))}
        </ul>
        <p className="launch-in mt-9 inline-flex items-center gap-2.5 text-[16px] font-medium tracking-[-0.01em] text-ink" style={{ animationDelay: "4100ms" }}>
          <span className="pulse-dot h-2 w-2 rounded-full bg-gradient-to-br from-sky to-iris" />{launch.closing}
        </p>
        <p className="launch-in mt-10 text-[11px] text-mute" style={{ animationDelay: "4400ms" }}>{profile.organization.name} · Powered by {profile.poweredBy}</p>
      </div>
    </div>
  );
}
