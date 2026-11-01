export const money = (n: number, cents = false) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents ? 2 : 0 });
export const num = (n: number) => n.toLocaleString("en-US");
export const pct = (n: number) => `${n.toFixed(1)}%`;
export function formatValue(n: number, f: "currency" | "number" | "percent") {
  return f === "currency" ? money(n) : f === "percent" ? pct(n) : num(n);
}

export function dateFromOffset(offset: number) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return d;
}
export function dayLabel(offset: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  return dateFromOffset(offset).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
export function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM"; const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}
export function addMinutes(t: string, mins: number) {
  const [h, m] = t.split(":").map(Number); const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;
export const nowTime = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
