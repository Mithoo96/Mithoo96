"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "./workspace";
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
    <span style={{ width: size, height: size, borderRadius: size * 0.32 }} className="relative inline-block shrink-0 overflow-hidden bg-gradient-to-br from-[#f6f3ff] via-white to-[#f7efe2] ring-1 ring-hair">
      <span style={{ inset: size / 4 }} className="absolute rounded-full bg-gradient-to-br from-sky/70 to-iris/70 blur-[1px]" />
    </span>
  );
}

/** The tenant's brand: monogram + business name from the config. */
export function Logo() {
  const { profile } = useWorkspace();
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5 px-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#f3f5ff] via-white to-[#f7efe2] text-[12px] font-semibold tracking-[-0.02em] text-ink ring-1 ring-hair">{profile.organization.monogram}</span>
      <span className="min-w-0 leading-tight"><span className="block truncate text-[14px] font-semibold tracking-[-0.02em]">{profile.organization.name}</span><span className="block truncate text-[11px] text-mute">{profile.product}</span></span>
    </Link>
  );
}

export function PoweredBy() {
  const { profile } = useWorkspace();
  return <p className="flex items-center gap-1.5 px-3 pt-5 text-[11px] text-mute"><LogoMark size={14} />Powered by {profile.poweredBy}</p>;
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <>
      <nav className="flex flex-col gap-1">
        {mainNav.map((i) => <NavLink key={i.label} item={i} active={isActive(i, path)}  onClick={onNavigate} />)}
      </nav>
      <nav className="mt-auto flex flex-col gap-1 pt-6">
        {bottomNav.map((i) => <NavLink key={i.label} item={i} active={isActive(i, path)} onClick={onNavigate} />)}
        <PoweredBy />
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-hair bg-white/60 px-4 py-7 backdrop-blur-xl lg:flex">
      <div className="mb-9"><Logo /></div>
      <NavList />
    </aside>
  );
}
