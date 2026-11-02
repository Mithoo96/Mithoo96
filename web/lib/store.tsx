"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type * as PrototypeData from "@/lib/prototype/doc-moise";
import type { Approval, ApprovalStatus, Appointment, BusinessMode, Client, ClientDocument, Conversation, DocStatus, Integration, LineKey, Note, Notification, Payment, Task, TeamMember, TimelineEvent } from "@/lib/types";
import { nowTime, uid } from "@/lib/format";


type Map<T> = Record<string, T[]>;
const byClient = <T,>(data: typeof PrototypeData | null, fn: ((c: Client) => T[]) | undefined) => Object.fromEntries((data?.clients ?? []).map((c) => [c.id, fn?.(c) ?? []])) as Map<T>;

/**
 * Frontend-only state for the prototype. Every action mutates local state so the UI
 * behaves like the real product. Swap these implementations for API calls later.
 */
function useOsState(mock: typeof PrototypeData | null, viewerName: string) {
  const [clients, setClients] = useState<Client[]>(mock?.clients ?? []);
  const [timelines, setTimelines] = useState<Map<TimelineEvent>>(() => byClient(mock, mock?.seedTimeline));
  const [documents, setDocuments] = useState<ClientDocument[]>(mock?.documents ?? []);
  const [mode, setMode] = useState<BusinessMode>("all");
  const [payments] = useState<Map<Payment>>(() => byClient(mock, mock?.seedPayments));
  const [notes, setNotes] = useState<Map<Note>>(() => byClient(mock, mock?.seedNotes));
  const [tasks, setTasks] = useState<Task[]>(mock?.tasks ?? []);
  const [appointments, setAppointments] = useState<Appointment[]>(mock?.appointments ?? []);
  const [conversations, setConversations] = useState<Conversation[]>(mock?.conversations ?? []);
  const [approvals, setApprovals] = useState<Approval[]>(mock?.approvals ?? []);
  const [notifications, setNotifications] = useState<Notification[]>(mock?.notifications ?? []);
  const [team, setTeam] = useState<TeamMember[]>(mock?.team ?? []);
  const [integrations, setIntegrations] = useState<Integration[]>(mock?.integrations ?? []);
  const replyIdx = useRef(0);

  const addTimeline = useCallback((clientId: string, e: Omit<TimelineEvent, "id" | "when"> & { when?: string }) =>
    setTimelines((m) => ({ ...m, [clientId]: [{ id: uid("t"), when: `Today, ${nowTime()}`, ...e }, ...(m[clientId] ?? [])] })), []);

  const actions = {
    addClient: (c: Omit<Client, "id">) => {
      const id = uid("c");
      setClients((l) => [{ ...c, id }, ...l]);
      setTimelines((m) => ({ ...m, [id]: [{ id: uid("t"), kind: "lead", title: "Client added", detail: "Added manually", when: `Today, ${nowTime()}`, by: "team" }] }));
      return id;
    },
    updateClient: (id: string, patch: Partial<Client>) => setClients((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    addTimeline,
    setMode,
    requestDocument: (clientId: string, name: string, line: LineKey) => {
      setDocuments((l) => {
        const existing = l.find((d) => d.clientId === clientId && d.name === name && d.status !== "received");
        if (existing) return l.map((d) => (d === existing ? { ...d, status: "requested", date: "Requested just now" } : d));
        return [{ id: uid("d"), clientId, line, name, status: "requested", date: "Requested just now" }, ...l];
      });
      addTimeline(clientId, { kind: "document", title: `${name} requested`, detail: "Secure upload link prepared", by: "team", brand: "gmail", line });
    },
    setDocumentStatus: (id: string, status: DocStatus, extra?: Partial<ClientDocument>) => setDocuments((l) => l.map((d) => (d.id === id ? { ...d, status, ...extra } : d))),
    uploadDocument: (id: string, fileName: string, size: number) => {
      setDocuments((l) => l.map((d) => (d.id === id ? { ...d, status: "review", date: `Uploaded just now · ${fileName}`, size: `${Math.max(1, Math.round(size / 1024))} KB` } : d)));
    },
    addNote: (clientId: string, text: string) => {
      setNotes((m) => ({ ...m, [clientId]: [{ id: uid("n"), text, when: "Just now", author: viewerName }, ...(m[clientId] ?? [])] }));
      addTimeline(clientId, { kind: "note", title: "Note added", detail: text, by: "team" });
    },
    addTask: (t: Omit<Task, "id" | "notes">) => { const id = uid("t"); setTasks((l) => [{ ...t, id, notes: [] }, ...l]); return id; },
    updateTask: (id: string, patch: Partial<Task>) => setTasks((l) => l.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    toggleTask: (id: string) => setTasks((l) => l.map((t) => t.id !== id ? t
      : t.bucket === "completed" ? { ...t, bucket: t.previousBucket ?? "today", previousBucket: undefined }
      : { ...t, previousBucket: t.bucket, bucket: "completed" })),
    addTaskNote: (id: string, text: string) => setTasks((l) => l.map((t) => (t.id === id ? { ...t, notes: [{ id: uid("n"), text, when: "Just now", author: viewerName }, ...t.notes] } : t))),
    setApprovalStatus: (id: string, status: ApprovalStatus) => setApprovals((l) => l.map((a) => (a.id === id ? { ...a, status } : a))),
    updateApproval: (id: string, patch: Partial<Approval>) => setApprovals((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    addApproval: (a: Omit<Approval, "id" | "status" | "when">) => setApprovals((l) => [{ ...a, id: uid("ap"), status: "pending", when: "Just now" }, ...l]),
    updateAppointment: (id: string, patch: Partial<Appointment>) => setAppointments((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    addAppointment: (a: Omit<Appointment, "id">) => {
      setAppointments((l) => [...l, { ...a, id: uid("a") }]);
      addTimeline(a.clientId, { kind: "appointment", title: "Appointment booked", detail: `${a.service}`, by: "team", brand: "googlecalendar" });
    },
    markConversationRead: (id: string) => setConversations((l) => l.map((c) => (c.id === id ? { ...c, unread: false } : c))),
    sendMessage: (convId: string, text: string) => {
      const msgId = uid("m");
      setConversations((l) => {
        const conv = l.find((c) => c.id === convId);
        const updated = conv ? { ...conv, unread: false, messages: [...conv.messages, { id: msgId, from: "me" as const, text, time: nowTime(), status: "sending" as const }] } : null;
        return updated ? [updated, ...l.filter((c) => c.id !== convId)] : l;
      });
      setTimeout(() => setConversations((l) => l.map((c) => c.id !== convId ? c : { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, status: "delivered" } : m)) })), 900);
      // Simulated reply so the conversation feels alive.
      setTimeout(() => setConversations((l) => l.map((c) => {
        if (c.id !== convId || c.channel === "internal" || !mock?.cannedReplies.length) return c;
        const reply = mock.cannedReplies[replyIdx.current++ % mock.cannedReplies.length];
        return { ...c, messages: [...c.messages, { id: uid("m"), from: "them", text: reply, time: nowTime() }] };
      })), 3200);
    },
    startConversation: (clientId: string, channel: Conversation["channel"], text: string) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return;
      setConversations((l) => {
        const existing = l.find((c) => c.clientId === clientId && c.channel === channel);
        const msg = { id: uid("m"), from: "me" as const, text, time: nowTime(), status: "delivered" as const };
        if (existing) return [{ ...existing, messages: [...existing.messages, msg] }, ...l.filter((c) => c !== existing)];
        return [{ id: uid("cv"), channel, clientId, name: client.name, unread: false, messages: [msg] }, ...l];
      });
      addTimeline(clientId, { kind: channel === "email" ? "email" : "sms", title: channel === "email" ? "Email sent" : channel === "whatsapp" ? "WhatsApp message sent" : "SMS sent", detail: text.slice(0, 80), by: "team", brand: channel === "email" ? "gmail" : channel === "whatsapp" ? "whatsapp" : undefined });
    },
    markNotificationRead: (id: string) => setNotifications((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllNotificationsRead: () => setNotifications((l) => l.map((n) => ({ ...n, read: true }))),
    inviteMember: (m: Omit<TeamMember, "id" | "status">) => setTeam((l) => [...l, { ...m, id: uid("u"), status: "invited" }]),
    setIntegrationState: (id: Integration["id"], state: Integration["state"]) => setIntegrations((l) => l.map((i) => (i.id === id ? { ...i, state } : i))),
  };

  return { mode, clients, timelines, documents, payments, notes, tasks, appointments, conversations, approvals, notifications, team, integrations, ...actions };
}

type OsState = ReturnType<typeof useOsState>;
const Ctx = createContext<OsState | null>(null);

export function OsProvider({ children, prototype = null, viewerName = "Workspace member" }: { children: ReactNode; prototype?: typeof PrototypeData | null; viewerName?: string }) {
  const state = useOsState(prototype, viewerName);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useOs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOs must be used inside OsProvider");
  return v;
}

/** Common derived values used across pages. */
export function useDerived() {
  const os = useOs();
  return useMemo(() => ({
    clientById: (id?: string) => os.clients.find((c) => c.id === id),
    memberById: (id?: string) => os.team.find((m) => m.id === id),
    pendingApprovals: os.approvals.filter((a) => a.status === "pending"),
    todayTasks: os.tasks.filter((t) => t.bucket === "today"),
    todayAppointments: os.appointments.filter((a) => a.day === 0 && a.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time)),
    unreadConversations: os.conversations.filter((c) => c.unread),
    clientsNeedingAttention: os.clients.filter((c) => c.status === "attention" || c.status === "waiting" || c.status === "new"),
    docsFor: (clientId: string) => os.documents.filter((d) => d.clientId === clientId),
    inMode: (lines?: LineKey[] | LineKey) => os.mode === "all" || !lines || (Array.isArray(lines) ? lines.includes(os.mode) : lines === os.mode),
  }), [os]);
}
