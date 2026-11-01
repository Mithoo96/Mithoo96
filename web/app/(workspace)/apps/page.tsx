"use client";

import { useState } from "react";
import { ArrowRight, Check, Lock, ShieldCheck, Plug, Search } from "lucide-react";
import { useOs } from "@/lib/store";
import type { Integration, IntegrationCategory } from "@/lib/types";
import { Page, PageHeader, SectionTitle, Segmented, SearchField, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { BrandIcon } from "@/components/brand-icon";
import { LogoMark } from "@/components/shell/sidebar";
import { business } from "@/lib/config/business";

const cats: ("All" | IntegrationCategory)[] = ["All", "Communication", "Marketing", "Payments", "CRM", "Productivity", "Accounting", "AI"];

export default function AppsPage() {
  const os = useOs(); const toast = useToast();
  const [cat, setCat] = useState<(typeof cats)[number]>("All"); const [q, setQ] = useState("");
  const [connecting, setConnecting] = useState<Integration | null>(null); const [phase, setPhase] = useState<"ask" | "working" | "done">("ask");
  const [manage, setManage] = useState<Integration | null>(null); const [confirmOff, setConfirmOff] = useState(false);
  const connected = os.integrations.filter((i) => i.state === "connected");
  const list = os.integrations.filter((i) => (cat === "All" || i.category === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));

  const startConnect = (i: Integration) => { setPhase("ask"); setConnecting(i); };
  const doConnect = () => { if (!connecting) return; setPhase("working"); setTimeout(() => { os.setIntegrationState(connecting.id, "connected"); setPhase("done"); toast({ title: `${connecting.name} connected`, description: "Simulated connection" }); }, 1600); };

  return (
    <Page>
      <PageHeader title="Apps" subtitle={`Everything ${business.name} uses, working together in one place.`} />

      <SectionTitle action={<span className="text-[13px] text-mute">{connected.length} connected</span>}>Connected to your business</SectionTitle>
      <div className="glass mb-12 overflow-hidden rounded-[28px] p-6 md:p-8">
        <div className="no-scrollbar flex gap-6 overflow-x-auto md:flex-wrap">
          {connected.map((i) => (
            <button key={i.id} onClick={() => setManage(i)} className="group flex w-[88px] shrink-0 flex-col items-center gap-3 text-center">
              <span className="relative transition-transform duration-500 group-hover:-translate-y-1"><BrandIcon brand={i.id} size="lg" />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"><Check size={11} strokeWidth={3} className="text-white" /></span></span>
              <span className="text-[13px] font-medium">{i.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented value={cat} onChange={setCat} options={cats.map((c) => ({ value: c, label: c }))} />
        <SearchField value={q} onChange={setQ} placeholder="Search apps" className="md:w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => (
          <div key={i.id} className="glass group flex flex-col rounded-[26px] p-6 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(40,40,110,0.16)]">
            <BrandIcon brand={i.id} size="lg" />
            <p className="mt-6 text-[17px] font-semibold tracking-[-0.02em]">{i.name}</p>
            <p className="text-[13px] text-mute">{i.kind}</p>
            <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-soft">{i.description}</p>
            <div className="mt-5 flex items-center justify-between">
              {i.state === "connected" ? <>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><Check size={14} strokeWidth={2.4} />Connected</span>
                <Button size="sm" variant="ghost" onClick={() => setManage(i)}>Manage</Button>
              </> : i.state === "soon" ? <span className="text-[13px] font-medium text-mute">Coming Soon</span>
                : <Button size="sm" iconRight={ArrowRight} onClick={() => startConnect(i)}>Connect</Button>}
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <EmptyState icon={Search} title="No apps found" />}
      <p className="mt-8 flex items-center justify-center gap-2 text-center text-[12px] text-mute"><Lock size={12} />Prototype: connections are simulated. No accounts are linked.</p>

      <Modal open={!!connecting} onClose={() => setConnecting(null)} size="sm">
        {connecting && <div className="flex flex-col items-center pb-2 pt-6 text-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white ring-1 ring-hair shadow-[0_4px_12px_-6px_rgba(30,30,80,0.12)]"><LogoMark size={30} /></span>
            <span className={`flex gap-1 ${phase === "working" ? "typing" : ""}`}>{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 rounded-full bg-iris/60" />)}</span>
            <BrandIcon brand={connecting.id} size="lg" />
          </div>
          {phase === "done" ? <>
            <p className="mt-6 text-[20px] font-semibold tracking-[-0.025em]">{connecting.name} is connected</p>
            <p className="mt-1 text-[14px] text-mute">Mithoo can now work with your {connecting.name} account.</p>
            <Button variant="primary" className="mt-6 w-full" onClick={() => setConnecting(null)}>Done</Button>
          </> : <>
            <p className="mt-6 text-[20px] font-semibold tracking-[-0.025em]">Connect {connecting.name}</p>
            <p className="mt-1 text-[14px] text-mute">Mithoo will be able to:</p>
            <ul className="mt-4 w-full space-y-2 text-left">{connecting.scopes.map((s) => <li key={s} className="flex items-center gap-2.5 rounded-2xl bg-[#f7f7fa] px-4 py-3 text-[14px]"><ShieldCheck size={16} className="text-emerald-600" />{s}</li>)}</ul>
            <Button variant="primary" className="mt-6 w-full" icon={Plug} loading={phase === "working"} onClick={doConnect}>{phase === "working" ? "Connecting…" : `Continue to ${connecting.name}`}</Button>
            <p className="mt-3 text-[12px] text-mute">Demo: no sign-in window opens and no account is linked.</p>
          </>}
        </div>}
      </Modal>

      <Modal open={!!manage && !confirmOff} onClose={() => setManage(null)} title={manage?.name} description={manage?.description}
        footer={<><Button variant="danger" onClick={() => setConfirmOff(true)}>Disconnect</Button><Button variant="primary" onClick={() => setManage(null)}>Done</Button></>}>
        {manage && <div className="space-y-3 pb-2">
          <div className="flex items-center gap-3"><BrandIcon brand={manage.id} size="md" /><div><p className="text-[14px] font-medium">Connected as {business.owner.email}</p><p className="text-[13px] text-mute">Last synced 4 minutes ago</p></div></div>
          <ul className="space-y-2">{manage.scopes.map((s) => <li key={s} className="flex items-center gap-2.5 rounded-2xl bg-[#f7f7fa] px-4 py-3 text-[14px]"><ShieldCheck size={16} className="text-emerald-600" />{s}</li>)}</ul>
        </div>}
      </Modal>
      <ConfirmDialog open={confirmOff} onClose={() => setConfirmOff(false)} tone="danger" confirmLabel="Disconnect" title={`Disconnect ${manage?.name}?`}
        body="Mithoo will stop syncing with this app. You can reconnect any time."
        onConfirm={() => { if (manage) { os.setIntegrationState(manage.id, "available"); toast({ title: `${manage.name} disconnected`, tone: "info" }); setManage(null); } }} />
    </Page>
  );
}
