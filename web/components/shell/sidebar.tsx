"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDerived } from "@/lib/store";
import { bottomNav, isActive, mainNav, type NavItem } from "./nav";

function NavLink({ item, active, badge, onClick }: { item: NavItem; active: boolean; badge?: number; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onClick} aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] transition-all duration-300 ${active ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,16,40,0.04),0_6px_20px_-8px_rgba(30,30,80,0.12)] ring-1 ring-hair" : "text-mute hover:text-ink"}`}>
      <Icon size={17} strokeWidth={1.6} />
      <span className="flex-1 tracking-[-0.01em]">{item.label}</span>
      {!!badge && <span className="rounded-full bg-[#f1effc] px-1.5 text-[11px] font-semibold tabular-nums text-iris">{badge}</span>}
    </Link>
  );
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.32 }} className="relative overflow-hidden bg-gradient-to-br from-[#f6f3ff] via-white to-[#f7efe2] ring-1 ring-hair">
      <div style={{ inset: size / 4 }} className="absolute rounded-full bg-gradient-to-br from-sky/70 to-iris/70 blur-[1px]" />
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">Mithoo</span>
    </Link>
  );
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { unreadConversations } = useDerived();
  return (
    <>
      <nav className="flex flex-col gap-1">
        {mainNav.map((i) => <NavLink key={i.label} item={i} active={isActive(i, path)} badge={i.label === "Inbox" ? unreadConversations.length : undefined} onClick={onNavigate} />)}
      </nav>
      <nav className="mt-auto flex flex-col gap-1 pt-6">
        {bottomNav.map((i) => <NavLink key={i.label} item={i} active={isActive(i, path)} onClick={onNavigate} />)}
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-hair bg-white/60 px-4 py-7 backdrop-blur-xl lg:flex">
      <div className="mb-10"><Logo /></div>
      <NavList />
    </aside>
  );
}
