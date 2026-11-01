"use client";

import { useWorkspace } from "./workspace";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav, MenuDrawer } from "./mobile-nav";
import { SearchModal } from "./search";
import { NotificationsDrawer } from "./notifications";
import { AssistantPanel, CommandBar } from "./assistant";
import { ShellCtx } from "./ui-context";
import { SessionProvider } from "./session";
import { HeroGlow } from "@/components/hero";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { profile } = useWorkspace();
  const operational = profile.viewer.role === "OWNER" || profile.viewer.role === "MANAGER";
  const [assistant, setAssistant] = useState<{ open: boolean; prompt?: string }>({ open: false });
  const [search, setSearch] = useState(false);
  const [notifs, setNotifs] = useState(false);
  const [menu, setMenu] = useState(false);
  const closeAssistant = useCallback(() => setAssistant({ open: false }), []);
  const closeSearch = useCallback(() => setSearch(false), []);
  const ui = useMemo(() => ({
    openAssistant: (prompt?: string) => setAssistant({ open: true, prompt }),
    openSearch: () => setSearch(true), openNotifications: () => setNotifs(true), openMenu: () => setMenu(true),
  }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [pageKey, setPageKey] = useState(0);
  useEffect(() => { const r = () => setPageKey((k) => k + 1); window.addEventListener("mithoo:replay-launch", r); return () => window.removeEventListener("mithoo:replay-launch", r); }, []);
  const showCommandBar = !path.startsWith("/inbox");
  return (
    <SessionProvider>
    <ShellCtx.Provider value={ui}>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-x-clip pb-20 md:pb-0">
          <Topbar />
          <HeroGlow />
          <div key={pageKey} className="relative flex-1">
            {path !== "/" && <p role="status" className="mx-6 mt-20 rounded-2xl bg-[#f7f7fa] p-4 text-[13px] text-mute">Prototype preview · this module is not connected to your organization. Changes here are local demonstrations.</p>}
            {operational || path === "/" ? children : <p className="p-8 text-mute">This module is not available for your role. Contact your organization administrator.</p>}
          </div>
          {showCommandBar && <CommandBar onOpen={ui.openAssistant} />}
        </main>
      </div>
      <MobileNav />
      <MenuDrawer open={menu} onClose={() => setMenu(false)} />
      <SearchModal open={search} onClose={closeSearch} />
      <NotificationsDrawer open={notifs} onClose={() => setNotifs(false)} />
      <AssistantPanel key={String(assistant.open)} open={assistant.open} initialPrompt={assistant.prompt} onClose={closeAssistant} />
    </ShellCtx.Provider>
    </SessionProvider>
  );
}
