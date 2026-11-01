import type { Appointment } from "@/lib/types";

const a = (id: string, clientId: string, service: string, day: number, time: string, duration: number, status: Appointment["status"], notes = "", location = "Studio · Room 2"): Appointment =>
  ({ id, clientId, service, day, time, duration, status, notes, location });

export const appointments: Appointment[] = [
  a("a01", "c03", "Membership check-in", 0, "10:30", 30, "confirmed", "Discuss adding a second weekly session."),
  a("a02", "c05", "Treatment session", 0, "15:00", 60, "pending", "Bring updated results from last week.", "Studio · Room 1"),
  a("a03", "c07", "First consultation", 1, "09:00", 45, "pending", "New lead from Instagram ad."),
  a("a04", "c16", "Follow-up session", 1, "14:00", 45, "confirmed"),
  a("a05", "c13", "Progress review", 2, "11:00", 45, "confirmed", "Review 8-week plan."),
  a("a06", "c11", "Membership session", 3, "08:30", 60, "confirmed"),
  a("a07", "c01", "Treatment plan start", 3, "16:00", 60, "pending", "Waiting on insurance card."),
  a("a08", "c02", "Consultation", 4, "10:00", 45, "pending", "", "Video call · Zoom"),
  a("a09", "c10", "Follow-up session", 6, "13:30", 45, "pending", "Rebooked after missed visit."),
  a("a10", "c05", "Treatment session", 7, "15:00", 60, "confirmed", "", "Studio · Room 1"),
  a("a11", "c03", "Membership session", 9, "10:30", 60, "confirmed"),
  a("a12", "c12", "Package intro", 11, "12:00", 30, "pending", "", "Video call · Zoom"),
  a("a13", "c13", "Treatment session", 14, "11:00", 60, "confirmed"),
  a("a14", "c04", "Follow-up session", 17, "09:30", 45, "pending"),
  a("a15", "c11", "Membership session", 21, "08:30", 60, "confirmed"),
  a("a16", "c08", "Final review", -2, "16:00", 30, "completed"),
  a("a17", "c10", "Follow-up session", -5, "13:30", 45, "cancelled", "No-show."),
  a("a18", "c16", "Follow-up session", -6, "14:00", 45, "completed"),
];
