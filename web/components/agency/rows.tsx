"use client";
import { Check, ChevronRight } from "lucide-react";
import { Avatar, StatusBadge } from "@/components/ui/primitives";
import { clientGrid } from "@/components/domain/client-card";
import type { AgencyClient, AgencyTask } from "@/server/adapters/agency";
import { MODULE_LABELS } from "@/core/agency/modules";
// Production data in the approved ClientCard and TaskItem row compositions.
export function AgencyClientRow({
  client,
  onOpen,
}: {
  client: AgencyClient;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[20px] px-4 py-4 text-left transition-all duration-300 hover:bg-white hover:shadow-[0_10px_30px_-14px_rgba(40,40,110,0.18)] hover:ring-1 hover:ring-hair ${clientGrid}`}
    >
      <Avatar name={client.name} size={40} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium tracking-[-0.01em]">
          {client.name}
        </p>
        <p className="truncate text-[13px] text-mute">
          {client.modules.map((m) => MODULE_LABELS[m]).join(" · ")}
        </p>
      </div>
      <p className="hidden truncate text-[14px] text-ink-soft md:block">
        Client
      </p>
      <p className="hidden truncate text-[13px] text-mute md:block">—</p>
      <p className="hidden truncate text-[14px] text-ink-soft md:block">
        {client.assignedTo.length} active assignment(s)
      </p>
      <div className="hidden md:block">
        <StatusBadge tone={client.status === "ACTIVE" ? "green" : "gray"}>
          {client.status.toLowerCase()}
        </StatusBadge>
      </div>
      <div className="flex items-center gap-2">
        <span className="md:hidden">
          <StatusBadge tone="green">{client.status.toLowerCase()}</StatusBadge>
        </span>
        <ChevronRight
          size={16}
          className="text-mute transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </button>
  );
}
export function AgencyTaskRow({
  task,
  name,
  onOpen,
}: {
  task: AgencyTask;
  name: string;
  onOpen: () => void;
}) {
  const done = task.status === "COMPLETED";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full cursor-pointer items-center gap-4 rounded-[18px] px-4 py-3.5 text-left transition-all duration-300 hover:bg-white hover:shadow-[0_10px_30px_-14px_rgba(40,40,110,0.18)] hover:ring-1 hover:ring-hair"
    >
      <span
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ring-1 ${done ? "bg-ink ring-ink" : "bg-white ring-[rgba(15,15,30,0.18)]"}`}
      >
        {done && <Check size={12} strokeWidth={2.6} className="text-white" />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[15px] tracking-[-0.01em] ${done ? "text-mute line-through" : "font-medium"}`}
        >
          {task.title}
        </p>
        <p className="truncate text-[13px] text-mute">
          {task.dueAt ? new Date(task.dueAt).toLocaleString() : "No deadline"} ·{" "}
          {name}
        </p>
      </div>
      <StatusBadge tone={done ? "green" : task.overdue ? "rose" : "violet"}>
        {done
          ? "Completed"
          : task.overdue
            ? "Overdue"
            : task.status.toLowerCase().replaceAll("_", " ")}
      </StatusBadge>
      <ChevronRight size={16} className="text-mute" />
    </button>
  );
}
