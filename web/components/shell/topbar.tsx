"use client";

import { Bell, Menu as MenuIcon, Search } from "lucide-react";
import { useOs } from "@/lib/store";
import { Logo } from "./sidebar";
import { useShell } from "./ui-context";

export function Topbar() {
  const { openSearch, openNotifications, openMenu } = useShell();
  const unread = useOs().notifications.filter((n) => !n.read).length;
  return (
    <>
      {/* Desktop: floating utilities, top-right, leaving the hero untouched */}
      <div className="absolute right-6 top-6 z-20 hidden items-center gap-2 lg:flex md:right-12">
        <button onClick={openSearch} className="glass flex h-10 items-center gap-2.5 rounded-full pl-4 pr-2 text-[13px] text-mute transition-all hover:text-ink">
          <Search size={15} strokeWidth={1.7} />Search
          <kbd className="rounded-md bg-[#f2f2f6] px-1.5 py-0.5 font-sans text-[11px] text-mute">⌘K</kbd>
        </button>
        <BellButton unread={unread} onClick={openNotifications} />
      </div>
      {/* Tablet & mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-hair bg-white/75 px-3 py-2.5 backdrop-blur-xl lg:hidden" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-1">
          <button onClick={openMenu} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-[#f4f4f8]"><MenuIcon size={19} strokeWidth={1.6} /></button>
          <Logo />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={openSearch} aria-label="Search" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-[#f4f4f8]"><Search size={18} strokeWidth={1.7} /></button>
          <BellButton unread={unread} onClick={openNotifications} plain />
        </div>
      </div>
    </>
  );
}

function BellButton({ unread, onClick, plain }: { unread: number; onClick: () => void; plain?: boolean }) {
  return (
    <button onClick={onClick} aria-label={`Notifications, ${unread} unread`} className={`relative flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-all hover:text-ink ${plain ? "hover:bg-[#f4f4f8]" : "glass"}`}>
      <Bell size={17} strokeWidth={1.7} />
      {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gradient-to-br from-sky to-iris ring-2 ring-white" />}
    </button>
  );
}
