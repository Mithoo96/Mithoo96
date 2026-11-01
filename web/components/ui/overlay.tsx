"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

function usePresence(open: boolean, ms = 240) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); const r = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); return () => cancelAnimationFrame(r); }
    setVisible(false); const t = setTimeout(() => setMounted(false), ms); return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted, visible };
}

function useOverlayKeys(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

const Scrim = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
  <div onClick={onClick} className={`fixed inset-0 bg-[rgba(245,245,250,0.55)] backdrop-blur-[6px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} />
);

interface OverlayProps { open: boolean; onClose: () => void; title?: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode }

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: OverlayProps & { size?: "sm" | "md" | "lg" }) {
  const { mounted, visible } = usePresence(open);
  useOverlayKeys(open, onClose);
  if (!mounted) return null;
  const w = size === "sm" ? "max-w-[420px]" : size === "lg" ? "max-w-[760px]" : "max-w-[560px]";
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <Scrim visible={visible} onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full ${w} flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(30,30,80,0.35)] ring-1 ring-hair transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)] sm:rounded-[28px] ${visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.98] opacity-0"}`}>
        {title && (
          <div className="flex items-start justify-between gap-4 px-7 pb-2 pt-7">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.025em]">{title}</h2>
              {description && <p className="mt-1 text-[14px] text-mute">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X size={16} /></Button>
          </div>
        )}
        <div className="overflow-y-auto px-7 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hair px-7 py-4">{footer}</div>}
      </div>
    </div>, document.body);
}

export function Drawer({ open, onClose, title, description, children, footer, width = 480 }: OverlayProps & { width?: number }) {
  const { mounted, visible } = usePresence(open, 320);
  useOverlayKeys(open, onClose);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true">
      <Scrim visible={visible} onClick={onClose} />
      <aside style={{ maxWidth: width }} className={`absolute inset-y-0 right-0 flex w-full flex-col bg-white/95 shadow-[0_0_80px_-20px_rgba(30,30,80,0.3)] ring-1 ring-hair backdrop-blur-2xl transition-transform duration-[380ms] ease-[cubic-bezier(.2,.8,.2,1)] sm:inset-y-3 sm:right-3 sm:rounded-[28px] ${visible ? "translate-x-0" : "translate-x-[105%]"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-hair px-7 pb-5 pt-7">
          <div className="min-w-0">
            {typeof title === "string" ? <h2 className="text-[20px] font-semibold tracking-[-0.025em]">{title}</h2> : title}
            {description && <div className="mt-1 text-[14px] text-mute">{description}</div>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X size={16} /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-hair px-7 py-4">{footer}</div>}
      </aside>
    </div>, document.body);
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = "Confirm", tone = "primary" }:
  { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; tone?: "primary" | "danger" }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={tone === "danger" ? "danger" : "primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <p className="text-[15px] leading-relaxed text-ink-soft">{body}</p>
    </Modal>
  );
}
