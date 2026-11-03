import type { AgencyModule } from "@/core/agency/modules";
export interface AgencyLead {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  module: AgencyModule;
  stageId: string;
  source: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  convertedAt: string | null;
  clientId: string | null;
  notes: string;
  tags: string[];
}
export interface AgencyStage {
  id: string;
  module: AgencyModule;
  code: string;
  label: string;
  position: number;
  isTerminal: boolean;
}
export interface AgencyClient {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  modules: AgencyModule[];
  assignedTo: string[];
}
export interface AgencyTask {
  id: string;
  leadId: string;
  title: string;
  status: string;
  dueAt: string | null;
  assignedTo: string | null;
  overdue: boolean;
}
export interface AgencySnapshot {
  notifications: {
    unreadCount: number;
    items: import("@/server/services/notifications").NotificationView[];
  };
  modules: AgencyModule[];
  stages: AgencyStage[];
  leads: AgencyLead[];
  clients: AgencyClient[];
  tasks: AgencyTask[];
  contacts: { id: string; name: string; email: string | null }[];
  team: { id: string; name: string }[];
  metrics: {
    newLeads: number;
    waitingFollowUp: number;
    overdueFollowUps: number;
    activeClients: number;
    tasksDue: number;
  };
}
export function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}
