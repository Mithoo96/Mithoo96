"use client";

import { useWorkspace } from "./workspace";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav, MenuDrawer } from "./mobile-nav";
import { SearchModal } from "./search";
import { NotificationsDrawer } from "./notifications";
import {workspaceRouteEnabled,workspaceRoleRouteEnabled} from "@/core/tenancy/modules";
import type {WorkspaceNotice} from "@/server/adapters/workspace-views";
import { ShellCtx } from "./ui-context";
import { SessionProvider } from "./session";
import { HeroGlow } from "@/components/hero";

export function AppShell({ children, notices }: { children: ReactNode; notices:WorkspaceNotice[] }) {
  const path = usePathname();
  const { profile } = useWorkspace();
  const [search, setSearch] = useState(false);
  const [notifs, setNotifs] = useState(false);
  const [menu, setMenu] = useState(false);
  const closeSearch = useCallback(() => setSearch(false), []);
  const ui = useMemo(() => ({
    openAssistant: () => {},
    openSearch: () => setSearch(true), openNotifications: () => setNotifs(true), openMenu: () => setMenu(true),
  }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [pageKey, setPageKey] = useState(0);
  useEffect(() => { const r = () => setPageKey((k) => k + 1); window.addEventListener("mithoo:replay-launch", r); return () => window.removeEventListener("mithoo:replay-launch", r); }, []);
  return (
    <SessionProvider>
    <ShellCtx.Provider value={ui}>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-x-clip pb-20 md:pb-0">
          <Topbar unread={notices.filter(n=>!n.read_at).length} />
          <HeroGlow />
          <div key={pageKey} className="relative flex-1">
            {workspaceRouteEnabled(profile.organization,path) && workspaceRoleRouteEnabled(profile.viewer.role,path) ? children : <p className="p-8 text-mute">This module is not available for your role. Contact your organization administrator.</p>}
          </div>
        </main>
      </div>
      <MobileNav />
      <MenuDrawer open={menu} onClose={() => setMenu(false)} />
      <SearchModal open={search} onClose={closeSearch} />
      <NotificationsDrawer notices={notices} open={notifs} onClose={() => setNotifs(false)} />
    </ShellCtx.Provider>
    </SessionProvider>
  );
}
