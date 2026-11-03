"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Users,
  Briefcase,
  CircleCheck,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import {
  MODULE_LABELS,
  AGENCY_MODULES,
  type AgencyModule,
} from "@/core/agency/modules";
import { AgencyGate, useAgency } from "./provider";
import {
  Page,
  PageHeader,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  StatusBadge,
  EmptyState,
  Segmented,
  Avatar,
} from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/overlay";
import { GlassCard, Eyebrow } from "@/components/ui";
import { Hero } from "@/components/hero";
import { ActivityItem } from "@/components/domain/activity-item";
import * as actions from "@/server/actions/agency";
import { AgencyClientRow, AgencyTaskRow } from "./rows";
import { clientGrid } from "@/components/domain/client-card";
import type { AgencyClient, AgencyTask } from "@/server/adapters/agency";
import type { AgencyLead } from "@/server/adapters/agency";
import type { TimelineEntry } from "@/server/services/activity";
const date = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");
export function AgencyPage({
  view,
}: {
  view: "leads" | "clients" | "work" | "home";
}) {
  return (
    <Page>
      <AgencyGate>
        <AgencyContent view={view} />
      </AgencyGate>
    </Page>
  );
}
function AgencyContent({
  view,
}: {
  view: "leads" | "clients" | "work" | "home";
}) {
  const a = useAgency();
  const w = a.workspace!;
  const [clientOpen, setClientOpen] = useState<AgencyClient | null>(null);
  const [taskOpen, setTaskOpen] = useState<AgencyTask | null>(null);
  const [bucket, setBucket] = useState("today");
  const [stageFilter, setStageFilter] = useState("");
  const [module, setModule] = useState<AgencyModule | "all">("all");
  const [query, setQuery] = useState("");
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<AgencyLead | null>(null);
  const enabledModule =
    module === "all" || w.modules.includes(module) ? module : "all";
  const leads = w.leads.filter(
    (l) =>
      !l.convertedAt &&
      (enabledModule === "all" || l.module === enabledModule) &&
      `${l.name} ${l.source} ${l.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const clients = w.clients.filter(
    (c) =>
      (enabledModule === "all" || c.modules.includes(enabledModule)) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  const tasks = w.tasks.filter(
    (t) =>
      enabledModule === "all" ||
      w.leads.find((l) => l.id === t.leadId)?.module === enabledModule,
  );
  const manage =
    a.profile?.viewer.role === "OWNER" || a.profile?.viewer.role === "MANAGER";
  const displayedLead = selected
    ? (w.leads.find((l) => l.id === selected.id) ?? null)
    : null;
  if (view === "home")
    return (
      <>
        <Hero />
        <div className="rise -mt-4 mb-8" style={{ animationDelay: "280ms" }}>
          <Segmented
            value={enabledModule}
            onChange={(m) => {
              setModule(m);
              setStageFilter("");
            }}
            options={[
              { value: "all", label: "All Business" },
              ...w.modules.map((m) => ({ value: m, label: MODULE_LABELS[m] })),
            ]}
          />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <GlassCard className="sheen overflow-hidden p-8 md:p-10" delay={300}>
            <Eyebrow>Today</Eyebrow>
            <div className="relative mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
              {[
                {
                  label: "New Leads",
                  value: leads.filter(
                    (l) =>
                      new Date(l.createdAt).toLocaleDateString("en-US", {
                        timeZone: a.profile!.organization.timezone,
                      }) ===
                      new Date().toLocaleDateString("en-US", {
                        timeZone: a.profile!.organization.timezone,
                      }),
                  ).length,
                  href: "/leads",
                },
                {
                  label: "Waiting for Follow-Up",
                  value: leads.filter(
                    (l) =>
                      l.nextFollowUpAt &&
                      !w.stages.find((s) => s.id === l.stageId)?.isTerminal,
                  ).length,
                  href: "/leads",
                },
                {
                  label: "Overdue Follow-Ups",
                  value: tasks.filter((t) => t.overdue).length,
                  href: "/work",
                },
                {
                  label: "Active Clients",
                  value: clients.filter((c) => c.status === "ACTIVE").length,
                  href: "/clients",
                },
              ].map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="group -m-2 rounded-2xl p-2 transition-colors hover:bg-white/60"
                >
                  <div className="text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums md:text-[56px]">
                    {s.value}
                  </div>
                  <div className="mt-2 text-[14px] text-mute">{s.label}</div>
                </Link>
              ))}
            </div>
            <div className="relative mt-10 flex items-center justify-between border-t border-hair pt-6">
              <p className="text-ink-soft">
                {tasks.filter((t) => t.overdue).length} overdue follow-ups need
                attention.
              </p>
              <Link href="/work" className="text-sm text-iris">
                View My Day →
              </Link>
            </div>
          </GlassCard>
          <GlassCard className="p-8" delay={380}>
            <Eyebrow>Your Business Is Moving</Eyebrow>
            <p className="mt-7 text-[15px] text-ink-soft">
              {tasks.filter((t) => t.status === "COMPLETED").length} follow-ups
              completed
            </p>
            <p className="mt-4 text-[15px] text-ink-soft">
              {
                w.leads.filter(
                  (l) =>
                    l.convertedAt &&
                    (enabledModule === "all" || l.module === enabledModule),
                ).length
              }{" "}
              leads converted to clients
            </p>
            <Link href="/leads" className="mt-7 block text-sm text-iris">
              Open lead pipeline →
            </Link>
          </GlassCard>
        </div>
        <AgencyDashboardTail moduleKey={enabledModule} />
        <div className="mt-5">
          <ModuleConfiguration />
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        title={
          view === "leads" ? "Leads" : view === "clients" ? "Clients" : "Work"
        }
        subtitle={
          view === "leads"
            ? "Capture, follow up, and keep your pipeline moving."
            : view === "clients"
              ? "Your agency relationships, with clear responsibility."
              : "Your next follow-up, with a clear outcome."
        }
        actions={
          view === "leads" && manage ? (
            <Button
              icon={Plus}
              variant="primary"
              onClick={() => setCreate(true)}
              disabled={!w.modules.length}
            >
              Add lead
            </Button>
          ) : undefined
        }
      />
      <div className="mb-6 flex flex-wrap gap-4">
        <Segmented
          value={enabledModule}
          onChange={(m) => {
            setModule(m);
            setStageFilter("");
          }}
          options={[
            { value: "all", label: "All Business" },
            ...w.modules.map((m) => ({ value: m, label: MODULE_LABELS[m] })),
          ]}
        />
        <Input
          aria-label="Search"
          placeholder="Search by name, source or tag"
          className="max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {view === "leads" && (
        <>
          <div className="no-scrollbar mb-6 flex gap-3 overflow-x-auto pb-2">
            {w.stages
              .filter(
                (s) => enabledModule === "all" || s.module === enabledModule,
              )
              .map((s) => (
                <Card
                  key={s.id}
                  className="min-w-[160px] p-4"
                  onClick={() =>
                    setStageFilter(stageFilter === s.id ? "" : s.id)
                  }
                >
                  <p className="text-2xl font-semibold tabular-nums">
                    {leads.filter((l) => l.stageId === s.id).length}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{s.label}</p>
                  <p className="text-xs text-mute">{MODULE_LABELS[s.module]}</p>
                </Card>
              ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {leads
              .filter((l) => !stageFilter || l.stageId === stageFilter)
              .map((l) => (
                <Card key={l.id} className="p-6" onClick={() => setSelected(l)}>
                  <div className="flex items-center gap-3">
                    <Avatar name={l.name} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold">{l.name}</h2>
                      <p className="text-sm text-mute">
                        {MODULE_LABELS[l.module]} · {l.source}
                      </p>
                    </div>
                    <StatusBadge
                      tone={l.priority === "URGENT" ? "rose" : "violet"}
                    >
                      {w.stages.find((s) => s.id === l.stageId)?.label ??
                        "Stage"}
                    </StatusBadge>
                  </div>
                  <p className="mt-5 text-sm text-ink-soft">
                    Follow-up: {date(l.nextFollowUpAt)}
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    {w.team.find((t) => t.id === l.assignedTo)?.name ??
                      (l.assignedTo === a.profile?.viewer.userId
                        ? "Assigned to you"
                        : l.assignedTo
                          ? "Assigned"
                          : "Unassigned")}
                  </p>
                </Card>
              ))}
          </div>
          {!leads.length && (
            <EmptyState
              icon={Users}
              title="No leads here yet"
              body="Capture a lead to start the operating loop."
            />
          )}
          <ModuleConfiguration />
        </>
      )}
      {view === "clients" && (
        <Card className="p-2">
          <div
            className={`hidden gap-4 px-4 pb-1 pt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-mute md:grid ${clientGrid}`}
          >
            <span className="w-10" />
            <span>Name · Service</span>
            <span>Stage</span>
            <span>Last Contact</span>
            <span>Next Action</span>
            <span>Status</span>
            <span className="w-4" />
          </div>
          {clients.map((c) => (
            <AgencyClientRow
              key={c.id}
              client={c}
              onOpen={() => setClientOpen(c)}
            />
          ))}
          {!clients.length && (
            <EmptyState
              icon={Users}
              title="No clients match"
              body="Convert a lead to preserve its contact and history."
            />
          )}
        </Card>
      )}
      {view === "work" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                href: "/approvals",
                title: "Approval Center",
                icon: CircleCheck,
              },
              {
                href: "/appointments",
                title: "Appointments",
                icon: CalendarDays,
              },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Card
                  className="flex items-center gap-4 p-5"
                  onClick={() => {}}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair">
                    <item.icon
                      size={18}
                      strokeWidth={1.6}
                      className="text-ink-soft"
                    />
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold">{item.title}</p>
                    <p className="text-[13px] text-mute">
                      Prototype preview · outside Batch 1
                    </p>
                  </div>
                  <ArrowUpRight size={16} className="text-mute" />
                </Card>
              </Link>
            ))}
          </div>
          <Segmented
            value={bucket}
            onChange={setBucket}
            className="mb-5"
            options={["today", "upcoming", "completed"].map((b) => ({
              value: b,
              label: b[0].toUpperCase() + b.slice(1),
            }))}
          />
          <Card className="p-2">
            {tasks
              .filter((t) =>
                bucket === "completed"
                  ? t.status === "COMPLETED"
                  : t.status !== "COMPLETED" &&
                    t.status !== "CANCELLED" &&
                    (bucket === "today"
                      ? !!t.dueAt &&
                        new Date(t.dueAt).toLocaleDateString("en-CA", {
                          timeZone: a.profile!.organization.timezone,
                        }) <=
                          new Date().toLocaleDateString("en-CA", {
                            timeZone: a.profile!.organization.timezone,
                          })
                      : !t.dueAt ||
                        new Date(t.dueAt).toLocaleDateString("en-CA", {
                          timeZone: a.profile!.organization.timezone,
                        }) >
                          new Date().toLocaleDateString("en-CA", {
                            timeZone: a.profile!.organization.timezone,
                          })),
              )
              .map((t) => (
                <AgencyTaskRow
                  key={t.id}
                  task={t}
                  name={
                    w.leads.find((l) => l.id === t.leadId)?.name ??
                    "Assigned lead"
                  }
                  onOpen={() => setTaskOpen(t)}
                />
              ))}
            {!tasks.length && (
              <EmptyState
                icon={Briefcase}
                title="All caught up"
                body="Assigned follow-ups will appear here."
              />
            )}
          </Card>
        </>
      )}
      <Drawer
        open={!!clientOpen && w.clients.some((c) => c.id === clientOpen.id)}
        onClose={() => setClientOpen(null)}
        title={clientOpen?.name ?? "Client"}
      >
        {clientOpen && w.clients.some((c) => c.id === clientOpen.id) && (
          <ClientDetail
            client={w.clients.find((c) => c.id === clientOpen.id)!}
          />
        )}
      </Drawer>
      <Drawer
        open={!!taskOpen}
        onClose={() => setTaskOpen(null)}
        title={taskOpen?.title ?? "Follow-up"}
      >
        {taskOpen &&
          (() => {
            const task = w.tasks.find((t) => t.id === taskOpen.id)!;
            return task ? (
              <div className="space-y-5">
                <p className="text-sm text-mute">Due {date(task.dueAt)}</p>
                <p className="text-ink-soft">
                  Contact the prospect and record the outcome. Schedule the next
                  follow-up from the lead when needed.
                </p>
                <StatusBadge
                  tone={task.status === "COMPLETED" ? "green" : "violet"}
                >
                  {task.status.toLowerCase().replaceAll("_", " ")}
                </StatusBadge>
                {task.assignedTo === a.profile?.viewer.userId &&
                  !["COMPLETED", "CANCELLED"].includes(task.status) && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        loading={a.busy}
                        onClick={() =>
                          void a.run(() =>
                            actions.completeAgencyFollowUp(
                              a.org,
                              task.id,
                              "NO_RESPONSE",
                            ),
                          )
                        }
                      >
                        No response · Complete
                      </Button>
                      <Button
                        variant="primary"
                        loading={a.busy}
                        onClick={() =>
                          void a.run(() =>
                            actions.completeAgencyFollowUp(
                              a.org,
                              task.id,
                              "CONTACTED",
                            ),
                          )
                        }
                      >
                        Contacted · Complete
                      </Button>
                    </div>
                  )}
                <Button
                  onClick={() => {
                    const l = w.leads.find((l) => l.id === task.leadId);
                    if (l) {
                      setTaskOpen(null);
                      setSelected(l);
                    }
                  }}
                >
                  Open lead
                </Button>
              </div>
            ) : null;
          })()}
      </Drawer>
      <Drawer
        open={create}
        onClose={() => setCreate(false)}
        title="Add lead"
        description="Use an existing contact or capture a new one."
      >
        {create && <CaptureLead onDone={() => setCreate(false)} />}
      </Drawer>
      <Drawer
        open={!!displayedLead}
        onClose={() => setSelected(null)}
        title={displayedLead?.name ?? "Lead"}
        description={displayedLead ? MODULE_LABELS[displayedLead.module] : ""}
      >
        {displayedLead && (
          <LeadDetail key={displayedLead.id} lead={displayedLead} />
        )}
      </Drawer>
    </>
  );
}
function CaptureLead({ onDone }: { onDone: () => void }) {
  const a = useAgency(),
    w = a.workspace!;
  const [contact, setContact] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const i = {
      module: f.get("module") as AgencyModule,
      source: String(f.get("source")),
      priority: f.get("priority") as "NORMAL",
      assignedTo: String(f.get("assignee") || "") || undefined,
      notes: String(f.get("notes") || ""),
      tags: String(f.get("tags") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      followUpAt: f.get("due")
        ? new Date(String(f.get("due"))).toISOString()
        : undefined,
    };
    const ok = await a.run(() =>
      contact
        ? actions.captureAgencyLead(a.org, { ...i, customerId: contact })
        : actions.captureAgencyContactLead(
            a.org,
            {
              name: String(f.get("name")),
              email: String(f.get("email") || "") || undefined,
              phone: String(f.get("phone") || "") || undefined,
            },
            i,
          ),
    );
    if (ok) onDone();
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      {a.error && (
        <p role="alert" className="text-sm text-rose-600">
          {a.error}
        </p>
      )}
      <Field label="Shared contact">
        <Select value={contact} onChange={(e) => setContact(e.target.value)}>
          <option value="">New contact</option>
          {w.contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.email ? ` · ${c.email}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      {!contact && (
        <>
          <Field label="Name">
            <Input name="name" required maxLength={200} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" />
          </Field>
          <Field label="Phone">
            <Input name="phone" maxLength={40} />
          </Field>
        </>
      )}
      <Field label="Service interest">
        <Select name="module">
          {w.modules.map((m) => (
            <option key={m} value={m}>
              {MODULE_LABELS[m]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Source">
        <Input name="source" defaultValue="MANUAL" required maxLength={100} />
      </Field>
      <Field label="Priority">
        <Select name="priority">
          {["NORMAL", "HIGH", "URGENT", "LOW"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
      </Field>
      <Field label="Assign">
        <Select name="assignee" aria-label="Assign">
          <option value="">Unassigned</option>
          {w.team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="First follow-up (your local time)">
        <Input type="datetime-local" name="due" />
      </Field>
      <Field
        label="Notes"
        hint="Operational notes only. No tax identifiers or medical information."
      >
        <Textarea name="notes" maxLength={4000} />
      </Field>
      <Field label="Tags, comma separated">
        <Input name="tags" />
      </Field>
      <Button type="submit" variant="primary" loading={a.busy}>
        Capture lead
      </Button>
    </form>
  );
}
function LeadDetail({ lead }: { lead: AgencyLead }) {
  const a = useAgency(),
    w = a.workspace!;
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [timelineError, setTimelineError] = useState("");
  useEffect(() => {
    let current = true;
    void actions
      .agencyLeadTimeline(a.org, lead.id)
      .then((r) => {
        if (current) {
          if (r.ok) setTimeline(r.data);
          else setTimelineError(r.error.message);
        }
      })
      .catch(() => {
        if (current) setTimelineError("Timeline unavailable");
      });
    return () => {
      current = false;
    };
  }, [a.org, lead.id, w]);
  return (
    <div className="space-y-6">
      {a.error && (
        <p role="alert" className="text-sm text-rose-600">
          {a.error}
        </p>
      )}
      <p className="text-sm text-mute">
        {lead.email ?? "No email"} · {lead.phone ?? "No phone"}
      </p>
      <p className="text-xs text-mute">
        Created {date(lead.createdAt)} · Last contact {date(lead.lastContactAt)}
      </p>
      {lead.convertedAt ? (
        <StatusBadge tone="green">Converted · history preserved</StatusBadge>
      ) : (
        <>
          <Field label="Pipeline stage">
            <Select
              value={lead.stageId}
              disabled={a.busy}
              onChange={(e) =>
                void a.run(() =>
                  actions.moveAgencyLead(a.org, lead.id, e.target.value),
                )
              }
            >
              {w.stages
                .filter((s) => s.module === lead.module)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
            </Select>
          </Field>
          {a.profile?.viewer.role !== "EMPLOYEE" && (
            <Field label="Assigned team member">
              <Select
                value={lead.assignedTo ?? ""}
                disabled={a.busy}
                onChange={(e) => {
                  if (e.target.value)
                    void a.run(() =>
                      actions.assignAgencyLead(a.org, lead.id, e.target.value),
                    );
                }}
              >
                <option value="">Unassigned</option>
                {w.team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const ok = await a.run(() =>
                actions.followUpAgencyLead(a.org, {
                  leadId: lead.id,
                  requestKey,
                  dueAt: new Date(String(f.get("due"))).toISOString(),
                  title: String(f.get("title")),
                }),
              );
              if (ok) setRequestKey(crypto.randomUUID());
            }}
          >
            <Field label="Next follow-up">
              <Input
                name="title"
                defaultValue="Follow up with prospect"
                required
                maxLength={200}
              />
            </Field>
            <Field label="Due (your local time)">
              <Input type="datetime-local" name="due" required />
            </Field>
            <Button type="submit" loading={a.busy} disabled={!lead.assignedTo}>
              Schedule follow-up
            </Button>
          </form>
          <Button
            variant="primary"
            loading={a.busy}
            onClick={() =>
              void a.run(() => actions.convertAgencyLead(a.org, lead.id))
            }
          >
            Convert to client
          </Button>
          <p className="text-xs text-mute">
            Complete outstanding follow-ups before conversion.
          </p>
        </>
      )}
      {lead.notes && (
        <p className="whitespace-pre-wrap text-sm text-ink-soft">
          {lead.notes}
        </p>
      )}
      {lead.tags.length > 0 && (
        <p className="text-sm text-mute">{lead.tags.join(" · ")}</p>
      )}
      <h3 className="text-lg font-semibold">Activity</h3>
      {timelineError && <p role="alert">{timelineError}</p>}
      <div className="space-y-5">
        {timeline.map((t) => (
          <ActivityItem
            key={t.id}
            title={t.summary}
            when={date(t.occurredAt)}
          />
        ))}
      </div>
    </div>
  );
}
function ModuleConfiguration() {
  const a = useAgency();
  const [modules, setModules] = useState<AgencyModule[]>(a.workspace!.modules);
  const [open, setOpen] = useState(false);
  if (a.profile?.viewer.role !== "OWNER") return null;
  return (
    <Card className="mt-6 p-6">
      <Button onClick={() => setOpen(!open)}>
        {open ? "Close configuration" : "Configure agency modules & pipeline"}
      </Button>
      {open && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap gap-5">
            {AGENCY_MODULES.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modules.includes(m)}
                  onChange={(e) =>
                    setModules(
                      e.target.checked
                        ? [...modules, m]
                        : modules.filter((x) => x !== m),
                    )
                  }
                />
                {MODULE_LABELS[m]}
              </label>
            ))}
          </div>
          <Button
            disabled={!modules.length}
            loading={a.busy}
            onClick={() =>
              void a.run(() => actions.configureAgency(a.org, { modules }))
            }
          >
            Save modules
          </Button>
          <form
            className="space-y-3 border-t border-hair pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void a.run(() =>
                actions.configurePipelineStage(a.org, {
                  module: f.get("module") as AgencyModule,
                  code: String(f.get("code")),
                  label: String(f.get("label")),
                  position: Number(f.get("position")),
                  isTerminal: f.get("terminal") === "on",
                }),
              );
            }}
          >
            <Field label="Module">
              <Select name="module">
                {a.workspace!.modules.map((m) => (
                  <option value={m} key={m}>
                    {MODULE_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Stage code (existing code updates its label/order)">
              <Input name="code" required pattern="[A-Z_]+" />
            </Field>
            <Field label="Stage label">
              <Input name="label" required maxLength={100} />
            </Field>
            <Field label="Position">
              <Input
                type="number"
                name="position"
                min="0"
                defaultValue="13"
                required
              />
            </Field>
            <label className="flex gap-2 text-sm">
              <input type="checkbox" name="terminal" />
              Terminal stage
            </label>
            <Button
              type="submit"
              loading={a.busy}
              disabled={!a.workspace!.modules.length}
            >
              Save stage
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

function ClientDetail({ client }: { client: AgencyClient }) {
  const a = useAgency();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  useEffect(() => {
    let current = true;
    void actions.agencyClientTimeline(a.org, client.id).then((r) => {
      if (current && r.ok) setTimeline(r.data);
    });
    return () => {
      current = false;
    };
  }, [a.org, client.id, a.workspace]);
  return (
    <div className="space-y-5">
      <p className="text-sm text-mute">
        {client.email ?? "No email"} · {client.phone ?? "No phone"}
      </p>
      <p>{client.modules.map((m) => MODULE_LABELS[m]).join(" · ")}</p>
      {a.profile?.viewer.role !== "EMPLOYEE" && (
        <>
          <Field label="Assign team member">
            <Select
              value=""
              disabled={a.busy}
              onChange={(e) => {
                if (e.target.value)
                  void a.run(() =>
                    actions.assignAgencyClient(
                      a.org,
                      client.id,
                      e.target.value,
                    ),
                  );
              }}
            >
              <option value="">Choose team member</option>
              {a.workspace!.team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          {client.assignedTo.map((id) => (
            <div key={id} className="flex items-center justify-between text-sm">
              <span>
                {a.workspace!.team.find((t) => t.id === id)?.name ??
                  "Assigned team member"}
              </span>
              <Button
                size="sm"
                disabled={a.busy}
                onClick={() =>
                  void a.run(() =>
                    actions.assignAgencyClient(a.org, client.id, id, false),
                  )
                }
              >
                Revoke
              </Button>
            </div>
          ))}
        </>
      )}
      <h3 className="text-lg font-semibold">Activity</h3>
      {timeline.map((t) => (
        <ActivityItem key={t.id} title={t.summary} when={date(t.occurredAt)} />
      ))}
    </div>
  );
}

function AgencyDashboardTail({
  moduleKey,
}: {
  moduleKey: AgencyModule | "all";
}) {
  const a = useAgency();
  const w = a.workspace!;
  const leads = w.leads.filter(
    (l) => !l.convertedAt && (moduleKey === "all" || l.module === moduleKey),
  );
  const overdue = w.tasks.filter(
    (t) =>
      t.overdue &&
      (moduleKey === "all" ||
        w.leads.find((l) => l.id === t.leadId)?.module === moduleKey),
  );
  return (
    <>
      {moduleKey !== "all" && (
        <div className="mt-5">
          <GlassCard className="p-8">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-[20px] font-semibold tracking-[-0.025em]">
                {MODULE_LABELS[moduleKey]} Pipeline
              </h2>
              <Link
                href="/leads"
                className="text-[13px] text-mute hover:text-ink"
              >
                View leads
              </Link>
            </div>
            <div className="no-scrollbar -mx-2 overflow-x-auto px-2">
              <div className="flex min-w-[720px] gap-3">
                {w.stages
                  .filter((s) => s.module === moduleKey)
                  .map((s) => (
                    <Link
                      href="/leads"
                      key={s.id}
                      className="group flex min-w-[80px] flex-1 flex-col"
                    >
                      <span className="mb-2 text-[22px] font-semibold tabular-nums tracking-[-0.03em]">
                        {leads.filter((l) => l.stageId === s.id).length}
                      </span>
                      <span className="relative h-24 overflow-hidden rounded-xl bg-[#f3f3f7]">
                        <span
                          className="absolute inset-x-0 bottom-0 rounded-xl bg-gradient-to-t from-iris/70 to-sky/50"
                          style={{
                            height: `${Math.max(8, (leads.filter((l) => l.stageId === s.id).length / Math.max(leads.length, 1)) * 100)}%`,
                          }}
                        />
                      </span>
                      <span className="mt-2.5 text-[12px] leading-snug text-ink-soft">
                        {s.label}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-8" delay={420}>
          <h2 className="text-[20px] font-semibold tracking-[-0.025em]">
            Needs Your Attention
          </h2>
          <ul className="mt-5 divide-y divide-hair">
            <li>
              <Link href="/work" className="flex items-center gap-4 py-3.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-[15px]">
                  {overdue.length} overdue follow-ups
                </span>
              </Link>
            </li>
            <li>
              <Link href="/leads" className="flex items-center gap-4 py-3.5">
                <span className="h-2 w-2 rounded-full bg-iris" />
                <span className="text-[15px]">
                  {leads.filter((l) => !l.assignedTo).length} leads awaiting
                  assignment
                </span>
              </Link>
            </li>
          </ul>
        </GlassCard>
        <GlassCard className="p-8" delay={720}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[20px] font-semibold tracking-[-0.025em]">
              Needs Your Approval
            </h2>
            <Link href="/approvals" className="text-[13px] text-mute">
              Preview
            </Link>
          </div>
          <p className="mt-6 text-[14px] text-mute">
            Agency approval workflows will be connected in a later batch.
          </p>
        </GlassCard>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            title: "Leads",
            href: "/leads",
            icon: Users,
            detail: "Keep your pipeline moving",
          },
          {
            title: "Clients",
            href: "/clients",
            icon: Users,
            detail: "Shared contacts, clear responsibility",
          },
          {
            title: "Work",
            href: "/work",
            icon: Briefcase,
            detail: "Your next follow-up",
          },
          {
            title: "Activity",
            href: "/leads",
            icon: CircleCheck,
            detail: "Open a lead to see its timeline",
          },
        ].map((item, i) => (
          <Link
            key={item.title}
            href={item.href}
            className="glass rise group relative flex flex-col rounded-[24px] p-6 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(40,40,110,0.16)] active:scale-[0.99]"
            style={{ animationDelay: `${460 + i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-[#f5f4fa] ring-1 ring-hair">
                <item.icon
                  size={18}
                  strokeWidth={1.6}
                  className="text-ink-soft"
                />
              </span>
              <ArrowUpRight
                size={16}
                strokeWidth={1.6}
                className="text-mute opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <div className="mt-8 text-[17px] font-semibold tracking-[-0.02em]">
              {item.title}
            </div>
            <div className="mt-1 text-[13px] text-mute">{item.detail}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
