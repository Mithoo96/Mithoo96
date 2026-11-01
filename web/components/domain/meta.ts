import type { ApprovalCategory, AppointmentStatus, ClientStatus, Task } from "@/lib/types";
import type { Tone } from "@/components/ui/primitives";

export const clientStatus: Record<ClientStatus, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "green" },
  new: { label: "New Lead", tone: "violet" },
  waiting: { label: "Waiting", tone: "amber" },
  attention: { label: "Needs Attention", tone: "rose" },
  completed: { label: "Completed", tone: "gray" },
};
export const appointmentStatus: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmed", tone: "green" }, pending: { label: "Unconfirmed", tone: "amber" },
  cancelled: { label: "Cancelled", tone: "gray" }, completed: { label: "Completed", tone: "blue" },
};
export const priorityTone: Record<Task["priority"], Tone> = { high: "rose", medium: "amber", low: "gray" };
export const approvalCategory: Record<ApprovalCategory, string> = { marketing: "Marketing", communication: "Client Communication", tax: "Tax Operations", insurance: "Insurance Operations" };
export const docStatus: Record<import("@/lib/types").DocStatus, { label: string; tone: Tone }> = {
  received: { label: "Received", tone: "green" }, missing: { label: "Missing", tone: "rose" }, requested: { label: "Requested", tone: "amber" }, review: { label: "Under Review", tone: "blue" },
};
export const lineTone = { tax: "blue", insurance: "violet" } as const;
/** "Tax", "Insurance" or "Tax + Insurance" */
export const clientTypeLabel = (lines: string[]) => (lines.length > 1 ? "Tax + Insurance" : lines[0] === "tax" ? "Tax" : "Insurance");
export const clientStage = (c: import("@/lib/types").Client) => [c.taxStage, c.insuranceStage].filter(Boolean).join(" · ");
