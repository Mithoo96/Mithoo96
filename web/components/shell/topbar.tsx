"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu as MenuIcon, Search, UserRound, Building2, Users, LogOut } from "lucide-react";
import { useAgency, useBusiness } from "@/components/agency/provider";
import { OwnerAvatar } from "@/components/owner-avatar";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useSession, AwakeIndicator } from "./session";
import { Logo } from "./sidebar";
import { useShell } from "./ui-context";

export function Topbar() {
  const { openSearch, openNotifications, openMenu } = useShell();
  const unread = useAgency().workspace?.notifications.unreadCount ?? 0;
  return (
    <>
      {/* Desktop: floating utilities, top-right, leaving the hero untouched */}
      <div className="absolute right-6 top-6 z-20 hidden items-center gap-2 lg:flex md:right-12">
        <button onClick={openSearch} className="glass flex h-10 items-center gap-2.5 rounded-full pl-4 pr-2 text-[13px] text-mute transition-all hover:text-ink">
          <Search size={15} strokeWidth={1.7} />Search
          <kbd className="rounded-md bg-[#f2f2f6] px-1.5 py-0.5 font-sans text-[11px] text-mute">⌘K</kbd>
        </button>
        <AwakeIndicator />
        <BellButton unread={unread} onClick={openNotifications} />
        <ProfileMenu />
      </div>
      {/* Tablet & mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-hair bg-white/75 px-3 py-2.5 backdrop-blur-xl lg:hidden" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-1">
          <button onClick={openMenu} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-[#f4f4f8]"><MenuIcon size={19} strokeWidth={1.6} /></button>
          <Logo />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={openSearch} aria-label="Search" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-[#f4f4f8]"><Search size={18} strokeWidth={1.7} /></button>
          <AwakeIndicator compact />
          <BellButton unread={unread} onClick={openNotifications} plain />
          <ProfileMenu small />
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

function ProfileMenu({ small = false }: { small?: boolean }) {
  const business = useBusiness();
  const agency = useAgency();
  const [open, setOpen] = useState(false); const [signOut, setSignOut] = useState(false);
  const router = useRouter(); const session = useSession();
  const go = (href: string) => { setOpen(false); router.push(href); };
  const items = [
    { label: "Profile", icon: UserRound, onClick: () => go("/settings#profile") },
    { label: "Business Settings", icon: Building2, onClick: () => go("/settings#business") },
    { label: "Team", icon: Users, onClick: () => go("/settings#team") },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open} className="rounded-full transition-transform active:scale-95">
        <OwnerAvatar size={small ? 32 : 40} />
      </button>
      {open && <>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div className="pop-in absolute right-0 z-40 mt-2 w-[260px] rounded-[22px] bg-white p-2 shadow-[0_24px_60px_-18px_rgba(30,30,80,0.35)] ring-1 ring-hair">
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <OwnerAvatar size={44} />
            <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{business.owner.name}</p><p className="truncate text-[12px] text-mute">{business.owner.title}</p><p className="truncate text-[12px] text-mute">{business.name}</p></div>
          </div>
          {agency.organizations.length > 0 && <div className="px-3 pb-3"><label className="text-[12px] text-mute" htmlFor="active-workspace">Workspace</label><select id="active-workspace" aria-label="Workspace" value={agency.org} disabled={agency.busy} onChange={e=>agency.selectOrg(e.target.value)} className="mt-1 w-full rounded-xl border border-hair bg-white p-2 text-sm">{agency.organizations.map(o=><option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}</select></div>}
          <div className="border-t border-hair pt-1.5">
            {items.map((i) => <button key={i.label} onClick={i.onClick} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] hover:bg-[#f4f4f8]"><i.icon size={15} strokeWidth={1.7} className="text-mute" />{i.label}</button>)}
            <button onClick={() => { setOpen(false); setSignOut(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] text-rose-600 hover:bg-rose-50"><LogOut size={15} strokeWidth={1.7} />Sign Out</button>
          </div>
        </div>
      </>}
      <ConfirmDialog open={signOut} onClose={() => setSignOut(false)} title="Sign out?" body="You'll return to the sign-in screen." confirmLabel="Sign Out" onConfirm={session.signOut} />
    </div>
  );
}
