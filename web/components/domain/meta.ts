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
export const approvalCategory: Record<ApprovalCategory, string> = { marketing: "Marketing", communication: "Communication", finance: "Finance", operations: "Operations" };
