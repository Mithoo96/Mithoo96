"use client";

import { CircleCheck, Info } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast { id: number; title: string; description?: string; tone: "success" | "info" }
const Ctx = createContext<(t: { title: string; description?: string; tone?: Toast["tone"] }) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((t: { title: string; description?: string; tone?: Toast["tone"] }) => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-2), { id, tone: "success", ...t }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:bottom-28 md:right-6 md:top-auto md:items-end">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in glass pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-2xl px-4 py-3.5" role="status">
            {t.tone === "success" ? <CircleCheck size={18} className="mt-px shrink-0 text-emerald-600" strokeWidth={1.8} /> : <Info size={18} className="mt-px shrink-0 text-iris" strokeWidth={1.8} />}
            <div className="min-w-0">
              <p className="text-[14px] font-medium tracking-[-0.01em]">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-mute">{t.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
