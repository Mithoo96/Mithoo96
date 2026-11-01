import type { BrandKey } from "@/components/brand-icon";
import type { BusinessMode, LineKey } from "@/lib/config/business";
export type { BusinessMode, LineKey };

export type ClientStatus = "active" | "new" | "waiting" | "attention" | "completed";
export interface Client {
  id: string; name: string; email: string; phone: string; status: ClientStatus; lines: LineKey[];
  service: string; taxStage?: string; insuranceStage?: string; product?: string;
  value: number; lastContact: string; nextAction: string; source: string; since: string; city: string;
}

export type TimelineKind = "lead" | "form" | "sms" | "email" | "appointment" | "document" | "reminder" | "payment" | "note" | "task" | "quote" | "application" | "return";
export interface TimelineEvent { id: string; kind: TimelineKind; title: string; detail?: string; when: string; by: "ai" | "team" | "client"; brand?: BrandKey; line?: LineKey }
export type DocStatus = "received" | "missing" | "requested" | "review";
export interface ClientDocument { id: string; clientId: string; name: string; line: LineKey; status: DocStatus; date: string; size?: string }
export interface Payment { id: string; label: string; amount: number; status: "paid" | "due" | "overdue"; date: string }
export interface Note { id: string; text: string; when: string; author: string }

export type TaskBucket = "today" | "upcoming" | "waiting" | "completed";
export interface Task {
  id: string; title: string; description: string; bucket: TaskBucket; due: string; line?: LineKey;
  priority: "high" | "medium" | "low"; assigneeId: string; clientId?: string; notes: Note[]; previousBucket?: TaskBucket;
}

export type AppointmentStatus = "confirmed" | "pending" | "cancelled" | "completed";
export interface Appointment {
  id: string; clientId: string; service: string; line: LineKey; day: number; time: string; duration: number;
  status: AppointmentStatus; notes: string; location: string;
}

export type Channel = "email" | "sms" | "whatsapp" | "instagram" | "facebook" | "internal";
export interface Message { id: string; from: "them" | "me" | "ai"; text: string; time: string; status?: "sending" | "delivered" }
export interface Conversation { id: string; channel: Channel; clientId?: string; name: string; subject?: string; unread: boolean; messages: Message[] }

export type ApprovalCategory = "marketing" | "communication" | "tax" | "insurance";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export interface Approval {
  id: string; title: string; meta: string; category: ApprovalCategory; status: ApprovalStatus;
  summary: string; details: { label: string; value: string }[]; requestedBy: string; when: string; brands?: BrandKey[];
}

export type Range = "today" | "7d" | "30d" | "custom";
export interface Metric {
  key: string; label: string; mode: BusinessMode; format: "currency" | "number" | "percent"; goodWhenUp: boolean;
  data: Record<Exclude<Range, "custom">, { value: number; delta: number; series: number[] }>;
  breakdownLabel: string; breakdown: { label: string; share: number }[];
}

export interface AiInsight { id: string; mode: BusinessMode; text: string; detail: string; action: string; href?: string; tone: "action" | "info" | "good" }
export interface Notification { id: string; kind: "action" | "important" | "ai"; title: string; body: string; time: string; href?: string; read: boolean; brand?: BrandKey }
export type Role = "Owner" | "Manager" | "Tax Preparer" | "Insurance Agent" | "Marketing" | "Staff";
export interface TeamMember { id: string; name: string; role: Role; email: string; status: "active" | "invited" }
export type IntegrationCategory = "Communication" | "Marketing" | "Payments" | "CRM" | "Productivity" | "Accounting" | "AI";
export interface Integration {
  id: BrandKey; name: string; kind: string; category: IntegrationCategory; description: string;
  state: "connected" | "available" | "soon"; scopes: string[];
}
export interface Campaign { id: string; name: string; line: LineKey | "all"; status: "live" | "draft" | "pending" | "ended"; brands: BrandKey[]; leads: number; spend: number; budget: number }
export interface AiActivity { id: string; text: string; when: string; brand?: BrandKey; href?: string; mode: BusinessMode }
