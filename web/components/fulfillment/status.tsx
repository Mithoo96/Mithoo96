import { StatusBadge } from "@/components/ui/primitives";
import { evaluateDeadline, DEFAULT_SHIPPING_DEADLINE_POLICY, formatDuration } from "@/core/risk/deadline";
export function Deadline({ at, status, timezone }: { at: string | null; status: string; timezone: string }) {
  const deadline = evaluateDeadline({ deadlineAt: at ? new Date(at) : null, now: new Date(), policy: DEFAULT_SHIPPING_DEADLINE_POLICY, satisfied: ["SHIPPED", "DELIVERED", "CANCELLED"].includes(status) });
  return <div className="space-y-2 text-[13px]">
    {at ? <p>{new Date(at).toLocaleString("en-US", { timeZone: timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {timezone}</p> : <p>No deadline stored</p>}
    {deadline.state === "OVERDUE" ? <StatusBadge tone="rose">Overdue · {formatDuration(deadline.minutesRemaining!)} — act now</StatusBadge> : deadline.state === "APPROACHING" ? <StatusBadge tone="amber">{formatDuration(deadline.minutesRemaining!)} left — prioritize</StatusBadge> : null}
  </div>;
}
export function OrderState({ status }: { status: string }) {
  return <StatusBadge tone={["SHIPPED", "DELIVERED", "READY_TO_SHIP"].includes(status) ? "green" : status === "CANCELLED" ? "gray" : "violet"}>{status.replaceAll("_", " ")}</StatusBadge>;
}
