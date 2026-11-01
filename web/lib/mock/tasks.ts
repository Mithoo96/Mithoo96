import type { Task } from "@/lib/types";

const t = (id: string, title: string, bucket: Task["bucket"], due: string, priority: Task["priority"], assigneeId: string, description: string, clientId?: string, line?: Task["line"]): Task =>
  ({ id, title, bucket, due, priority, assigneeId, description, clientId, line, notes: [] });

export const tasks: Task[] = [
  t("t01", "Review Pierre tax documents", "today", "10:00 AM", "high", "u1", "Jean uploaded his Photo ID. W-2 and 1099 are still missing, so check what's there and decide whether to call.", "c01", "tax"),
  t("t02", "Follow up with insurance lead", "today", "10:30 AM", "high", "u3", "Kevin requested a Term Life quote from the Facebook ad 40 minutes ago. Speed matters.", "c03", "insurance"),
  t("t03", "Review life insurance application", "today", "11:00 AM", "high", "u1", "Tamika's Final Expense application is complete except for the beneficiary section.", "c06", "insurance"),
  t("t04", "Call client about missing W-2", "today", "12:30 PM", "medium", "u2", "Patrick is also missing last year's return. Offer to request a transcript.", "c15", "tax"),
  t("t05", "Approve campaign", "today", "1:00 PM", "high", "u1", "Life insurance lead campaign on Instagram + Facebook. $300 over 10 days."),
  t("t06", "Final review: Alvarez business return", "today", "2:30 PM", "medium", "u1", "Ricardo's business return is ready for your signature.", "c05", "tax"),
  t("t07", "Collect Jamal's signature", "today", "4:00 PM", "medium", "u3", "Living Benefits application needs an e-signature before submission.", "c20", "insurance"),
  t("t08", "Review weekly business report", "today", "End of day", "low", "u1", "Tax leads are up. Insurance follow-up slowed on Thursday."),
  t("t09", "Needs analysis with Andre", "upcoming", "Thu", "medium", "u3", "Whole Life consultation. Bring three carrier options.", "c11", "insurance"),
  t("t10", "Send tax season reminder", "upcoming", "Next week", "medium", "u5", "Reach out to last year's clients before January.", undefined, "tax"),
  t("t11", "Deliver Carmen's policy", "upcoming", "Fri", "medium", "u3", "Approved Final Expense policy. Schedule a 20-minute delivery call.", "c16", "insurance"),
  t("t12", "Renew preparer credentials", "upcoming", "Dec 15", "high", "u2", "Annual PTIN renewal."),
  t("t13", "Underwriting decision for Nadine", "waiting", "Waiting on carrier", "medium", "u3", "IUL underwriting. Carrier estimated 5–7 business days.", "c04", "insurance"),
  t("t14", "Social Security card from Fabiola", "waiting", "Waiting on client", "low", "u2", "Reminder sent by Mithoo yesterday on WhatsApp.", "c10", "tax"),
  t("t15", "IRS acceptance for Stephanie", "waiting", "Waiting on IRS", "low", "u2", "E-filed last week.", "c14", "tax"),
  t("t16", "File Linda's return", "completed", "Done last week", "medium", "u2", "Accepted by the IRS.", "c08", "tax"),
  t("t17", "Send welcome pack to Marie-Claude", "completed", "Done yesterday", "low", "u4", "Whole Life welcome pack delivered.", "c02", "insurance"),
  t("t18", "Update fee schedule", "completed", "Done Mon", "low", "u1", "New tax preparation prices are live."),
];
