"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Inbox, Sparkles, CircleCheck } from "lucide-react";
import { useShell } from "./ui-context";
import { Drawer } from "@/components/ui/overlay";
import { NavList } from "./sidebar";

const items = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Work", icon: Briefcase, href: "/work" },
  { label: "Approvals", icon: CircleCheck, href: "/approvals" },
  { label: "Inbox", icon: Inbox, href: "/inbox" },
];

export function MobileNav() {
  const path = usePathname(); const { openAssistant } = useShell();
  const badge: Record<string, number> = {}; // Never show prototype counts in authenticated chrome.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-white/85 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-5">
        {items.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "text-ink" : "text-mute"}`}>
              <i.icon size={20} strokeWidth={active ? 1.9 : 1.6} />{i.label}
              {!!badge[i.label] && <span className="absolute left-1/2 top-1.5 ml-2 rounded-full bg-iris px-1 text-[10px] font-semibold leading-4 text-white">{badge[i.label]}</span>}
            </Link>
          );
        })}
        <button onClick={() => openAssistant()} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-mute">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#e6edff] via-[#efe9ff] to-[#f6eedd]"><Sparkles size={12} className="text-iris" /></span>Ask
        </button>
      </div>
    </nav>
  );
}

export function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title="Mithoo" width={320}>
      <div className="flex min-h-full flex-col"><NavList onNavigate={onClose} /></div>
    </Drawer>
  );
}
