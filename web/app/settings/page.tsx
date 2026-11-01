"use client";

import { useEffect, useState } from "react";
import { Building2, Users, ShieldCheck, Bell, Palette, Sparkles, CreditCard, Lock, UserPlus, Save, Monitor, Smartphone, Check, type LucideIcon } from "lucide-react";
import { useOs } from "@/lib/store";
import { business, defaultPermissions, permissionAreas, roles } from "@/lib/mock";
import type { Role } from "@/lib/types";
import { Avatar, Card, Field, Input, Page, PageHeader, Select, StatusBadge, Textarea, Toggle, Chip, Segmented } from "@/components/ui/primitives";
import { Button, useSimulated } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { BrandIcon } from "@/components/brand-icon";

const sections: { k: string; label: string; icon: LucideIcon }[] = [
  { k: "profile", label: "Business Profile", icon: Building2 }, { k: "team", label: "Team", icon: Users }, { k: "permissions", label: "Permissions", icon: ShieldCheck },
  { k: "notifications", label: "Notifications", icon: Bell }, { k: "brand", label: "Brand", icon: Palette }, { k: "ai", label: "AI Preferences", icon: Sparkles },
  { k: "billing", label: "Billing", icon: CreditCard }, { k: "security", label: "Security", icon: Lock },
];

function SaveBar({ label = "Save Changes" }: { label?: string }) {
  const s = useSimulated(900); const toast = useToast();
  return <div className="flex justify-end border-t border-hair pt-5"><Button variant="primary" icon={Save} loading={s.loading} done={s.done} onClick={() => s.run(() => toast({ title: "Settings saved", description: "Stored in this demo session only" }))}>{s.done ? "Saved" : label}</Button></div>;
}

export default function SettingsPage() {
  const [sec, setSec] = useState("profile");
  useEffect(() => { const h = window.location.hash.slice(1); if (sections.some((s) => s.k === h)) setSec(h); }, []);
  const go = (k: string) => { setSec(k); history.replaceState(null, "", `#${k}`); };
  return (
    <Page>
      <PageHeader title="Settings" subtitle={business.name} />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:px-0">
          {sections.map((s) => (
            <button key={s.k} onClick={() => go(s.k)} className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] transition-all ${sec === s.k ? "bg-white text-ink shadow-[0_6px_20px_-8px_rgba(30,30,80,0.12)] ring-1 ring-hair" : "text-mute hover:text-ink"}`}>
              <s.icon size={16} strokeWidth={1.6} />{s.label}
            </button>
          ))}
        </nav>
        <div key={sec} className="page-enter min-w-0">
          {sec === "profile" && <Profile />}{sec === "team" && <Team />}{sec === "permissions" && <Permissions />}{sec === "notifications" && <NotificationPrefs />}
          {sec === "brand" && <Brand />}{sec === "ai" && <AiPrefs />}{sec === "billing" && <Billing />}{sec === "security" && <Security />}
        </div>
      </div>
    </Page>
  );
}

function Profile() {
  const [f, setF] = useState(business);
  return (
    <Card className="space-y-5 p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business Name"><Input id="bp-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Industry"><Select id="bp-industry" value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })}>{["Health & Wellness", "Beauty & Spa", "Professional Services", "Fitness", "Home Services"].map((i) => <option key={i}>{i}</option>)}</Select></Field>
        <Field label="Phone"><Input id="bp-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><Input id="bp-email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Website"><Input id="bp-web" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
        <Field label="Business Hours"><Input id="bp-hours" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field>
      </div>
      <Field label="Address"><Input id="bp-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      <Field label="Services"><div className="flex flex-wrap gap-2">{f.services.map((s) => <Chip key={s} active>{s}</Chip>)}<Chip onClick={() => setF({ ...f, services: [...f.services, "New service"] })}>+ Add service</Chip></div></Field>
      <SaveBar />
    </Card>
  );
}

function Team() {
  const os = useOs(); const toast = useToast(); const [open, setOpen] = useState(false);
  const [inv, setInv] = useState({ name: "", email: "", role: "Staff" as Role });
  const roleTone = { Owner: "violet", Manager: "blue", Staff: "gray", Marketing: "amber" } as const;
  return (
    <Card className="p-2">
      <div className="flex items-center justify-between px-5 pb-2 pt-4"><p className="text-[15px] font-semibold">{os.team.length} members</p><Button size="sm" variant="primary" icon={UserPlus} onClick={() => setOpen(true)}>Invite</Button></div>
      {os.team.map((m) => (
        <div key={m.id} className="flex items-center gap-4 rounded-2xl px-5 py-3.5">
          <Avatar name={m.name} size={38} />
          <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium">{m.name}</p><p className="truncate text-[13px] text-mute">{m.email}</p></div>
          {m.status === "invited" && <span className="hidden text-[12px] text-mute sm:inline">Invite sent</span>}
          <StatusBadge tone={roleTone[m.role]}>{m.role}</StatusBadge>
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="Invite a team member" description="They'll get an email to join your workspace."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" disabled={!inv.name || !inv.email.includes("@")} onClick={() => { os.inviteMember(inv); toast({ title: "Invitation prepared", description: `${inv.email} · demo only` }); setInv({ name: "", email: "", role: "Staff" }); setOpen(false); }}>Send Invite</Button></>}>
        <div className="space-y-4">
          <Field label="Name"><Input id="inv-name" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} /></Field>
          <Field label="Email"><Input id="inv-email" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} /></Field>
          <Field label="Role"><div className="grid grid-cols-2 gap-2">{roles.filter((r) => r !== "Owner").map((r) => <Chip key={r} active={inv.role === r} onClick={() => setInv({ ...inv, role: r })}>{r}</Chip>)}</div></Field>
        </div>
      </Modal>
    </Card>
  );
}

function Permissions() {
  const [p, setP] = useState(defaultPermissions);
  return (
    <Card className="p-6 md:p-8">
      <p className="mb-5 text-[14px] text-mute">Choose what each role can see and change. The Owner always has full access.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[14px]">
          <thead><tr className="text-left text-[12px] uppercase tracking-[0.12em] text-mute"><th className="pb-3 font-medium">Area</th>{roles.map((r) => <th key={r} className="pb-3 text-center font-medium">{r}</th>)}</tr></thead>
          <tbody className="divide-y divide-hair">
            {permissionAreas.map((a) => (
              <tr key={a}><td className="py-3.5 font-medium">{a}</td>
                {roles.map((r) => <td key={r} className="py-3.5 text-center"><span className="inline-flex"><Toggle label={`${r} access to ${a}`} checked={p[r][a]} onChange={(v) => r !== "Owner" && setP({ ...p, [r]: { ...p[r], [a]: v } })} /></span></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5"><SaveBar /></div>
    </Card>
  );
}

function NotificationPrefs() {
  const groups = [
    { t: "Needs Action", d: "Approvals, unconfirmed appointments, overdue payments", on: [true, true, true] },
    { t: "Important", d: "Renewals, new leads, negative reviews", on: [true, false, true] },
    { t: "AI Handled", d: "A daily summary of what Mithoo did for you", on: [false, false, true] },
  ];
  const [s, setS] = useState(groups.map((g) => g.on));
  return (
    <Card className="p-6 md:p-8">
      <div className="mb-3 grid grid-cols-[1fr_repeat(3,56px)] gap-2 text-center text-[12px] uppercase tracking-[0.12em] text-mute"><span /><span>Push</span><span>SMS</span><span>Email</span></div>
      <div className="divide-y divide-hair">
        {groups.map((g, i) => (
          <div key={g.t} className="grid grid-cols-[1fr_repeat(3,56px)] items-center gap-2 py-4">
            <div><p className="text-[15px] font-medium">{g.t}</p><p className="text-[13px] text-mute">{g.d}</p></div>
            {s[i].map((v, j) => <span key={j} className="flex justify-center"><Toggle label={`${g.t} channel ${j}`} checked={v} onChange={(nv) => setS(s.map((row, ri) => ri === i ? row.map((x, ci) => (ci === j ? nv : x)) : row))} /></span>)}
          </div>
        ))}
      </div>
      <div className="mt-2"><SaveBar /></div>
    </Card>
  );
}

function Brand() {
  const colors = ["#0b0b0f", "#8b7cf6", "#7aa7ff", "#e9d9bd", "#2f6b5a"]; const [color, setColor] = useState(colors[1]);
  const [voice, setVoice] = useState("Warm"); const toast = useToast();
  return (
    <Card className="space-y-6 p-6 md:p-8">
      <div className="flex items-center gap-5"><span className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#f6f3ff] via-white to-[#f7efe2] text-[22px] font-semibold ring-1 ring-hair">SW</span>
        <div><p className="text-[15px] font-medium">Logo</p><p className="text-[13px] text-mute">PNG or SVG, at least 512px</p><Button size="sm" className="mt-2" onClick={() => toast({ title: "Uploads are disabled in the demo", tone: "info" })}>Upload logo</Button></div></div>
      <Field label="Brand color"><div className="flex gap-3">{colors.map((c) => <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`h-10 w-10 rounded-full ring-offset-2 transition-all ${color === c ? "ring-2 ring-ink" : "ring-1 ring-hair"}`} style={{ background: c }} />)}</div></Field>
      <Field label="Voice"><div className="flex flex-wrap gap-2">{["Warm", "Professional", "Playful", "Calm", "Direct"].map((v) => <Chip key={v} active={voice === v} onClick={() => setVoice(v)}>{v}</Chip>)}</div></Field>
      <Field label="Words to avoid" hint="Mithoo won't use these in anything it writes."><Input id="brand-avoid" defaultValue="cheap, guaranteed, miracle" /></Field>
      <Field label="About your business"><Textarea id="brand-about" defaultValue="A calm, modern wellness studio in the Mission. We build personal plans and stay with clients for the long run." /></Field>
      <SaveBar />
    </Card>
  );
}

function AiPrefs() {
  const [level, setLevel] = useState<"ask" | "suggest" | "auto">("suggest");
  const caps = [{ t: "Reply to common questions", b: "instagram" as const, on: true }, { t: "Send appointment reminders", b: "whatsapp" as const, on: true }, { t: "Follow up with new leads", b: "gmail" as const, on: true }, { t: "Confirm appointments", b: "googlecalendar" as const, on: true }, { t: "Send payment reminders", b: "stripe" as const, on: false }];
  const [on, setOn] = useState(caps.map((c) => c.on));
  const desc = { ask: "Mithoo drafts everything and waits for your approval.", suggest: "Routine messages go out automatically. Anything new or involving money waits for you.", auto: "Mithoo handles everything it's confident about and tells you afterwards." };
  return (
    <Card className="space-y-7 p-6 md:p-8">
      <div><p className="mb-3 text-[15px] font-medium">How much should Mithoo do on its own?</p>
        <Segmented value={level} onChange={setLevel} options={[{ value: "ask", label: "Ask first" }, { value: "suggest", label: "Balanced" }, { value: "auto", label: "Hands-off" }]} />
        <p className="mt-3 text-[14px] text-mute">{desc[level]}</p></div>
      <div className="divide-y divide-hair">
        {caps.map((c, i) => <div key={c.t} className="flex items-center gap-4 py-3.5"><BrandIcon brand={c.b} size="sm" /><p className="flex-1 text-[14px]">{c.t}</p><Toggle label={c.t} checked={on[i]} onChange={(v) => setOn(on.map((x, j) => (j === i ? v : x)))} /></div>)}
      </div>
      <div><p className="mb-3 text-[15px] font-medium">AI models</p>
        <div className="flex flex-wrap gap-3">{(["claude", "openai"] as const).map((m) => <span key={m} className="inline-flex items-center gap-2.5 rounded-2xl bg-white py-2 pl-2 pr-4 text-[14px] ring-1 ring-hair"><BrandIcon brand={m} size="sm" />{m === "claude" ? "Claude" : "OpenAI"}<span className="text-[12px] text-mute">Coming soon</span></span>)}</div></div>
      <SaveBar />
    </Card>
  );
}

function Billing() {
  const toast = useToast(); const [plan, setPlan] = useState(false);
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-[#dfe7ff] via-[#ece6ff] to-[#f6ecda] opacity-70 blur-3xl" />
        <p className="relative text-[12px] font-medium uppercase tracking-[0.16em] text-mute">Current plan</p>
        <p className="relative mt-2 text-[28px] font-semibold tracking-[-0.03em]">Studio <span className="text-[16px] font-normal text-mute">$149 / month</span></p>
        <p className="relative mt-1 text-[14px] text-mute">Renews Dec 1 · 5 seats · unlimited clients</p>
        <div className="relative mt-5 flex gap-2"><Button variant="primary" onClick={() => setPlan(true)}>Change Plan</Button><Button onClick={() => toast({ title: "Billing portal is not connected in the demo", tone: "info" })}>Payment method</Button></div>
      </Card>
      <Card className="p-2">
        <p className="px-5 pb-1 pt-4 text-[15px] font-semibold">Invoices</p>
        {["Nov 1, 2026", "Oct 1, 2026", "Sep 1, 2026"].map((d) => (
          <div key={d} className="flex items-center gap-4 rounded-2xl px-5 py-3.5"><BrandIcon brand="stripe" size="sm" /><p className="flex-1 text-[14px]">{d}</p><p className="text-[14px] font-medium tabular-nums">$149.00</p><StatusBadge tone="green">Paid</StatusBadge></div>
        ))}
      </Card>
      <Modal open={plan} onClose={() => setPlan(false)} title="Change plan" size="lg">
        <div className="grid gap-3 pb-3 md:grid-cols-3">
          {[["Solo", "$59", "1 seat"], ["Studio", "$149", "5 seats · current"], ["Growth", "$299", "15 seats · priority support"]].map(([n, p, d]) => (
            <button key={n} onClick={() => { setPlan(false); toast({ title: n === "Studio" ? "You're already on Studio" : `Switched to ${n}`, description: "Demo only. No charge was made.", tone: n === "Studio" ? "info" : "success" }); }}
              className={`rounded-[22px] p-5 text-left ring-1 transition-all hover:-translate-y-0.5 ${n === "Studio" ? "ring-2 ring-ink" : "ring-hair"}`}>
              <p className="text-[16px] font-semibold">{n}</p><p className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">{p}<span className="text-[13px] font-normal text-mute"> /mo</span></p><p className="mt-1 text-[13px] text-mute">{d}</p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function Security() {
  const toast = useToast(); const [twofa, setTwofa] = useState(true); const [revoke, setRevoke] = useState<string | null>(null);
  const [sessions, setSessions] = useState([{ id: "s1", d: "MacBook Pro · Safari", w: "San Francisco · Active now", i: Monitor, current: true }, { id: "s2", d: "iPhone 16 · Mithoo app", w: "San Francisco · 2h ago", i: Smartphone }, { id: "s3", d: "Windows · Chrome", w: "Oakland · 3 days ago", i: Monitor }]);
  return (
    <div className="space-y-5">
      <Card className="flex items-center justify-between gap-4 p-6"><div><p className="text-[15px] font-medium">Two-step verification</p><p className="text-[13px] text-mute">Ask for a code when signing in on a new device.</p></div>
        <Toggle label="Two-step verification" checked={twofa} onChange={(v) => { setTwofa(v); toast({ title: v ? "Two-step verification on" : "Two-step verification off", tone: v ? "success" : "info" }); }} /></Card>
      <Card className="p-2">
        <p className="px-5 pb-1 pt-4 text-[15px] font-semibold">Signed-in devices</p>
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-4 rounded-2xl px-5 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f6f6f9]"><s.i size={16} className="text-ink-soft" /></span>
            <div className="flex-1"><p className="text-[14px] font-medium">{s.d}</p><p className="text-[13px] text-mute">{s.w}</p></div>
            {s.current ? <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700"><Check size={13} />This device</span> : <Button size="sm" variant="ghost" onClick={() => setRevoke(s.id)}>Sign out</Button>}
          </div>
        ))}
      </Card>
      <ConfirmDialog open={!!revoke} onClose={() => setRevoke(null)} tone="danger" confirmLabel="Sign out" title="Sign out this device?" body="It will need to sign in again."
        onConfirm={() => { setSessions(sessions.filter((s) => s.id !== revoke)); toast({ title: "Device signed out" }); }} />
    </div>
  );
}
