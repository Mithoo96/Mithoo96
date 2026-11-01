"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sun, Lock } from "lucide-react";
import { business } from "@/lib/config/business";
import { OwnerAvatar } from "@/components/owner-avatar";
import { replayLaunch } from "@/components/launch-screen";
import { useToast } from "@/components/ui/toast";

/**
 * Simulated session: awake mode, inactivity prompt, lock and sign-out.
 * In production this maps to the real auth session; here it's frontend state only.
 */
type Status = "active" | "locked" | "signedOut";
interface Session {
  status: Status; awake: boolean; idleMinutes: number;
  setAwake: (v: boolean) => void; setIdleMinutes: (m: number) => void;
  signOut: () => void; lock: () => void; signIn: () => void;
}
const Ctx = createContext<Session | null>(null);
export const useSession = () => { const s = useContext(Ctx); if (!s) throw new Error("useSession outside SessionProvider"); return s; };

export function SessionProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [status, setStatus] = useState<Status>("active");
  const [awake, setAwake] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState<number>(business.session.idleMinutes);
  const [prompt, setPrompt] = useState(false);
  const last = useRef(Date.now());

  const signIn = useCallback(() => { setStatus("active"); setPrompt(false); last.current = Date.now(); replayLaunch(); }, []);
  const value: Session = {
    status, awake, idleMinutes, setIdleMinutes,
    setAwake: (v) => { setAwake(v); last.current = Date.now(); },
    signOut: () => { setPrompt(false); setStatus("signedOut"); },
    lock: () => { setPrompt(false); setStatus("locked"); },
    signIn,
  };

  // Track activity; while the prompt is open, only an explicit answer counts.
  useEffect(() => {
    const bump = () => { if (!prompt) last.current = Date.now(); };
    const evs = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const done = () => { last.current = Date.now(); };
    window.addEventListener("mithoo:launch-done", done);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); window.removeEventListener("mithoo:launch-done", done); };
  }, [prompt]);

  useEffect(() => {
    if (awake || status !== "active" || prompt) return;
    const t = setInterval(() => {
      if (document.documentElement.classList.contains("launching")) { last.current = Date.now(); return; }
      if (Date.now() - last.current >= idleMinutes * 60_000) setPrompt(true);
    }, 1000);
    return () => clearInterval(t);
  }, [awake, status, prompt, idleMinutes]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {prompt && status === "active" && <AwakePrompt
        onStay={() => { setAwake(true); setPrompt(false); last.current = Date.now(); toast({ title: "Awake mode on", description: "Mithoo will keep your session open while you work." }); }}
        onLock={() => value.lock()} />}
      {status !== "active" && <RestScreen status={status} onContinue={signIn} />}
    </Ctx.Provider>
  );
}

function AwakePrompt({ onStay, onLock }: { onStay: () => void; onLock: () => void }) {
  const total = business.session.answerSeconds;
  const [left, setLeft] = useState<number>(total);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0) onLock(); }, [left, onLock]);
  const r = 26, c = 2 * Math.PI * r;
  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-5" role="alertdialog" aria-modal="true" aria-labelledby="awake-title">
      <div className="absolute inset-0 bg-[rgba(245,245,250,0.6)] backdrop-blur-[10px]" />
      <div className="assistant-in relative w-full max-w-[440px] overflow-hidden rounded-[30px] bg-white/95 p-8 text-center shadow-[0_40px_100px_-30px_rgba(40,40,120,0.45)] ring-1 ring-hair">
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-44 w-[90%] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#dfe7ff] via-[#ece6ff] to-[#f6ecda] opacity-80 blur-3xl" />
        <div className="relative mx-auto h-16 w-16">
          <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="32" cy="32" r={r} fill="none" stroke="#eeeef4" strokeWidth="3" />
            <circle cx="32" cy="32" r={r} fill="none" stroke="url(#awake-g)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} style={{ transition: "stroke-dashoffset 1s linear" }} />
            <defs><linearGradient id="awake-g"><stop offset="0" stopColor="#7aa7ff" /><stop offset="1" stopColor="#8b7cf6" /></linearGradient></defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center"><Sun size={22} strokeWidth={1.6} className="text-iris" /></span>
        </div>
        <p id="awake-title" className="relative mt-6 text-[22px] font-semibold tracking-[-0.025em]">Still working, {business.owner.firstName}?</p>
        <p className="relative mt-2 text-[14px] leading-relaxed text-mute">You’ve been away for a little while. Do you want to stay in awake mode and keep {business.name} open while you continue working?</p>
        <div className="relative mt-7 grid gap-2">
          <button autoFocus onClick={onStay} className="h-12 rounded-full bg-ink text-[15px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(10,10,30,0.5)] transition-all hover:-translate-y-px active:scale-[0.98]">Yes, stay in awake mode</button>
          <button onClick={onLock} className="h-12 rounded-full bg-white text-[15px] font-medium text-ink ring-1 ring-hair transition-all hover:bg-[#f7f7fa] active:scale-[0.98]">No, lock for now</button>
        </div>
        <p className="relative mt-4 text-[12px] tabular-nums text-mute">Locking automatically in {Math.max(0, left)}s</p>
      </div>
    </div>, document.body);
}

function RestScreen({ status, onContinue }: { status: Status; onContinue: () => void }) {
  const locked = status === "locked";
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden bg-white px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="orb orb-a left-[15%] top-[20%] h-[420px] w-[420px] bg-[#c9d8ff] opacity-40" />
        <div className="orb orb-c right-[12%] top-[30%] h-[380px] w-[380px] bg-[#f3e6cf] opacity-50" />
      </div>
      <div className="relative flex flex-col items-center">
        <OwnerAvatar size={92} />
        <p className="mt-6 text-[28px] font-semibold tracking-[-0.03em]">{locked ? "Your session is paused" : `See you soon, ${business.owner.firstName}.`}</p>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] text-mute">{locked ? <><Lock size={13} />Locked to keep client information private.</> : `You're signed out of ${business.name}.`}</p>
        <button onClick={onContinue} className="mt-8 rounded-full bg-ink px-7 py-3 text-[14px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(10,10,30,0.5)] transition-all hover:-translate-y-px active:scale-[0.97]">
          {locked ? `Continue as ${business.owner.firstName}` : "Sign back in"}
        </button>
        <p className="mt-12 text-[11px] text-mute">{business.name} · Powered by {business.poweredBy}</p>
      </div>
    </div>, document.body);
}

/** Small pill in the top bar while awake mode is on. Click to turn it off. */
export function AwakeIndicator({ compact = false }: { compact?: boolean }) {
  const { awake, setAwake } = useSession(); const toast = useToast();
  if (!awake) return null;
  return (
    <button onClick={() => { setAwake(false); toast({ title: "Awake mode off", description: "Mithoo will check in again after a while.", tone: "info" }); }}
      title="Awake mode is on. Click to turn off." aria-label="Awake mode on. Turn off"
      className={`glass inline-flex h-10 items-center gap-2 rounded-full text-[13px] font-medium text-ink-soft transition-all hover:text-ink ${compact ? "w-10 justify-center" : "px-3.5"}`}>
      <span className="relative flex h-2 w-2"><span className="pulse-dot absolute inset-0 rounded-full bg-amber-300" /><span className="relative h-2 w-2 rounded-full bg-amber-400" /></span>
      {!compact && "Awake"}
    </button>
  );
}
