export type DayPart = "morning" | "afternoon" | "evening";

export function getDayPart(date: Date = new Date()): DayPart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

export const greetings: Record<DayPart, { text: string; emoji: string }> = {
  morning: { text: "Good morning", emoji: "🌞" },
  afternoon: { text: "Good afternoon", emoji: "☀️" },
  evening: { text: "Good evening", emoji: "🌙" },
};
export const LAUNCH_KEY = "mithoo:launch-seen";
