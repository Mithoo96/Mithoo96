"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ChartLine, CircleCheck, Users, Inbox, FileText } from "lucide-react";
import { useAgency } from "@/components/agency/provider";
import { Avatar } from "@/components/ui/primitives";
import { BrandIcon, type BrandKey } from "@/components/brand-icon";

type Result = { group: string; label: string; sub: string; href: string; avatar?: string; brand?: BrandKey };

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {workspace} = useAgency(); const router = useRouter();
  const [q, setQ] = useState(""); const [sel, setSel] = useState(0);
  useEffect(() => { if (open) { setQ(""); setSel(0); } }, [open]);

  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase();
    const has = (t: string) => !s || t.toLowerCase().includes(s);
    return [
      ...(workspace?.clients??[]).filter(c=>has(c.name)).slice(0,4).map(c=>({group:'Clients',label:c.name,sub:'Agency client',href:'/clients',avatar:c.name})),
      ...(workspace?.leads??[]).filter(l=>!l.convertedAt&&has(l.name)).slice(0,4).map(l=>({group:'Leads',label:l.name,sub:l.module.replaceAll('_',' '),href:'/leads',avatar:l.name})),
      ...(workspace?.tasks??[]).filter(t=>t.status!=='COMPLETED'&&has(t.title)).slice(0,3).map(t=>({group:'Tasks',label:t.title,sub:t.dueAt?new Date(t.dueAt).toLocaleString():'No deadline',href:'/work'})),
    ];
  }, [q, workspace]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
      if (e.key === "Enter" && results[sel]) { router.push(results[sel].href); onClose(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [open, results, sel, router, onClose]);

  if (!open) return null;
  const groupIcon = { Leads: Users, Clients: Users, Tasks: CircleCheck, Messages: Inbox, Documents: FileText, Reports: ChartLine } as const;
  let idx = -1;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-[rgba(245,245,250,0.6)] backdrop-blur-[6px]" onClick={onClose} />
      <div className="pop-in relative w-full max-w-[620px] overflow-hidden rounded-[26px] bg-white shadow-[0_30px_80px_-20px_rgba(30,30,80,0.35)] ring-1 ring-hair">
        <div className="flex items-center gap-3 border-b border-hair px-5">
          <Search size={18} strokeWidth={1.7} className="text-mute" />
          <input id="global-search" autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Search leads, clients, tasks…" className="h-14 flex-1 bg-transparent text-[16px] focus:outline-none" />
          <kbd className="rounded-md bg-[#f2f2f6] px-1.5 py-0.5 text-[11px] text-mute">esc</kbd>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-4 py-10 text-center text-[14px] text-mute">No results for “{q}”.</p>}
          {(["Leads", "Clients", "Tasks", "Messages", "Documents", "Reports"] as const).map((g) => {
            const rs = results.filter((r) => r.group === g); if (!rs.length) return null;
            const GI = groupIcon[g];
            return (
              <div key={g} className="py-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-mute">{g}</p>
                {rs.map((r) => { idx++; const i = idx; return (
                  <button key={r.href + r.label} onMouseEnter={() => setSel(i)} onClick={() => { router.push(r.href); onClose(); }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${sel === i ? "bg-[#f4f3fb]" : ""}`}>
                    {r.avatar ? <Avatar name={r.avatar} size={30} /> : r.brand ? <BrandIcon brand={r.brand} size="sm" /> : <span className="flex h-8 w-8 items-center justify-center rounded-[10px] ring-1 ring-hair"><GI size={15} className="text-mute" /></span>}
                    <span className="min-w-0"><span className="block truncate text-[14px] font-medium">{r.label}</span><span className="block truncate text-[12px] text-mute">{r.sub}</span></span>
                  </button>
                ); })}
              </div>
            );
          })}
        </div>
      </div>
    </div>, document.body);
}
