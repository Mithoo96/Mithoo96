"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "./workspace";
import { visibleNav, mainNav, bottomNav } from "./nav";
import { Drawer } from "@/components/ui/overlay";
import { NavList } from "./sidebar";


export function MobileNav() {
  const path = usePathname(); const workspace = useWorkspace();
  const items = visibleNav([...mainNav, ...bottomNav], workspace).filter((i) => ["/", "/orders", "/work", "/inbox", "/settings"].includes(i.href));
  const badge: Record<string, number> = {}; // Never show prototype counts in authenticated chrome.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-white/85 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length || 1}, minmax(0, 1fr))` }}>
        {items.map((i) => {
          const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "text-ink" : "text-mute"}`}>
              <i.icon size={20} strokeWidth={active ? 1.9 : 1.6} />{i.label}
              {!!badge[i.label] && <span className="absolute left-1/2 top-1.5 ml-2 rounded-full bg-iris px-1 text-[10px] font-semibold leading-4 text-white">{badge[i.label]}</span>}
            </Link>
          );
        })}

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
