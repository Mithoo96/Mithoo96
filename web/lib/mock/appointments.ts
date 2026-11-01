import type { Appointment } from "@/lib/types";

const a = (id: string, clientId: string, service: string, line: Appointment["line"], day: number, time: string, duration: number, status: Appointment["status"], notes = "", location = "Office"): Appointment =>
  ({ id, clientId, service, line, day, time, duration, status, notes, location });

export const appointments: Appointment[] = [
  a("a01", "c05", "Tax Preparation", "tax", 0, "10:00", 45, "confirmed", "Final review of the business return and signature."),
  a("a02", "c11", "Needs Analysis", "insurance", 0, "13:30", 60, "confirmed", "Whole Life. Spouse joining by phone.", "Video call · Zoom"),
  a("a03", "c19", "Tax Consultation", "tax", 0, "16:00", 30, "pending", "New lead from Instagram. First-time filer."),
  a("a04", "c03", "Life Insurance Consultation", "insurance", 1, "09:30", 45, "pending", "Term Life, 20-year. Two children under 10.", "Video call · Zoom"),
  a("a05", "c12", "Tax Preparation", "tax", 1, "11:00", 60, "confirmed"),
  a("a06", "c09", "Policy Review", "insurance", 2, "14:00", 30, "confirmed", "Go over the Term Life quote."),
  a("a07", "c11", "Life Insurance Consultation", "insurance", 3, "10:00", 45, "confirmed"),
  a("a08", "c07", "Tax Consultation", "tax", 3, "15:30", 30, "pending"),
  a("a09", "c16", "Policy Review", "insurance", 4, "12:00", 20, "pending", "Policy delivery call.", "Phone"),
  a("a10", "c17", "Tax Preparation", "tax", 6, "10:30", 60, "confirmed"),
  a("a11", "c22", "Life Insurance Consultation", "insurance", 7, "17:30", 45, "pending", "", "Video call · Zoom"),
  a("a12", "c18", "Policy Review", "insurance", 10, "11:00", 30, "confirmed", "Annual review."),
  a("a13", "c21", "Needs Analysis", "insurance", 13, "14:00", 45, "pending", "Cross-sell from tax client."),
  a("a14", "c02", "Tax Preparation", "tax", 16, "10:00", 45, "confirmed"),
  a("a15", "c08", "Policy Review", "insurance", -3, "15:00", 30, "completed"),
  a("a16", "c13", "Life Insurance Consultation", "insurance", -4, "18:00", 45, "cancelled", "No-show."),
  a("a17", "c14", "Tax Preparation", "tax", -7, "10:00", 45, "completed"),
];
