import type { Task } from "@/lib/types";

const t = (id: string, title: string, bucket: Task["bucket"], due: string, priority: Task["priority"], assigneeId: string, description: string, clientId?: string): Task =>
  ({ id, title, bucket, due, priority, assigneeId, description, clientId, notes: [] });

export const tasks: Task[] = [
  t("t01", "Review client documents", "today", "10:00 AM", "high", "u1", "Amelia uploaded her ID. Check it and confirm the treatment plan can start.", "c01"),
  t("t02", "Approve campaign", "today", "11:00 AM", "high", "u1", "The fall reactivation campaign is ready. Budget $300 over 10 days on Instagram and Facebook."),
  t("t03", "Call client", "today", "12:30 PM", "high", "u2", "Lucas's invoice is 12 days overdue. Offer a payment plan if needed.", "c06"),
  t("t04", "Follow up with lead", "today", "1:00 PM", "medium", "u2", "Marcus asked about consultation pricing on the website form.", "c02"),
  t("t05", "Confirm appointment", "today", "2:00 PM", "medium", "u3", "Priya's 3:00 PM session is not confirmed yet.", "c05"),
  t("t06", "Review weekly report", "today", "4:00 PM", "low", "u1", "Revenue is up 12%. Lead response time slowed on Thursday."),
  t("t07", "Prepare treatment plan", "today", "5:00 PM", "medium", "u3", "Draft the 8-week plan for Grace before her progress review.", "c13"),
  t("t08", "Reply to Instagram questions", "today", "End of day", "low", "u4", "Three unanswered DMs about memberships."),
  t("t09", "Send membership renewal", "upcoming", "Tomorrow", "medium", "u2", "Emma's membership renews in 9 days.", "c11"),
  t("t10", "Plan November newsletter", "upcoming", "Thu", "low", "u4", "Seasonal wellness tips and the holiday package."),
  t("t11", "Order treatment supplies", "upcoming", "Fri", "medium", "u3", "Stock is low on two items."),
  t("t12", "Quarterly tax documents", "upcoming", "Next week", "high", "u1", "Send Q3 statements to the accountant."),
  t("t13", "Lab results for James", "waiting", "Waiting on lab", "medium", "u3", "Expected within 2 business days.", "c04"),
  t("t14", "Signed consent from Mateo", "waiting", "Waiting on client", "medium", "u2", "Reminder sent yesterday by Mithoo.", "c14"),
  t("t15", "Intake form from Olivia", "waiting", "Waiting on client", "low", "u2", "Second reminder scheduled for tomorrow.", "c09"),
  t("t16", "Send welcome pack", "completed", "Done yesterday", "low", "u2", "Sent to Leo.", "c16"),
  t("t17", "Update service prices", "completed", "Done Mon", "medium", "u1", "New prices are live on the website."),
  t("t18", "Ask Daniel for a review", "completed", "Done last week", "low", "u4", "Review received on Google.", "c08"),
];
