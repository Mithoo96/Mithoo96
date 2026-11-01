import type { Notification, AiActivity } from "@/lib/types";

export const notifications: Notification[] = [
  { id: "n1", kind: "action", title: "Campaign ready for approval", body: "Fall reactivation · $300 budget", time: "2h ago", href: "/approvals", read: false, brand: "meta" },
  { id: "n2", kind: "action", title: "Lucas asked to split his payment", body: "Invoice #1042 · $480", time: "8:00 AM", href: "/inbox", read: false, brand: "stripe" },
  { id: "n3", kind: "action", title: "Priya hasn't confirmed today's session", body: "3:00 PM · Treatment session", time: "9:30 AM", href: "/appointments", read: false, brand: "googlecalendar" },
  { id: "n4", kind: "important", title: "Invoice 12 days overdue", body: "Lucas Martin · $480", time: "Today", href: "/clients/c06", read: false },
  { id: "n5", kind: "important", title: "Emma's membership renews in 9 days", body: "She replied: same plan.", time: "Mon", href: "/clients/c11", read: true, brand: "gmail" },
  { id: "n6", kind: "ai", title: "14 reminders sent", body: "Appointment reminders for this week", time: "7:00 AM", read: true, brand: "whatsapp" },
  { id: "n7", kind: "ai", title: "3 appointments confirmed", body: "Sofia, Leo and Grace confirmed", time: "7:15 AM", read: true, brand: "googlecalendar" },
  { id: "n8", kind: "ai", title: "Payment received", body: "Priya Nair · $1,550", time: "Yesterday", read: true, brand: "stripe" },
];

export const aiActivityToday = [
  { count: 14, label: "reminders sent", brand: "whatsapp" as const },
  { count: 3, label: "appointments confirmed", brand: "googlecalendar" as const },
  { count: 7, label: "leads followed up", brand: "gmail" as const },
  { count: 2, label: "questions answered", brand: "instagram" as const },
];

export const aiActivityLog: AiActivity[] = [
  { id: "l1", text: "Sent 24-hour reminders to 14 clients", when: "7:00 AM", brand: "whatsapp", href: "/appointments" },
  { id: "l2", text: "Confirmed appointments with Sofia, Leo and Grace", when: "7:15 AM", brand: "googlecalendar", href: "/appointments" },
  { id: "l3", text: "Followed up with 7 new leads within 5 minutes", when: "8:05 AM", brand: "gmail", href: "/clients" },
  { id: "l4", text: "Answered Hannah’s question about the fall package", when: "8:02 AM", brand: "instagram", href: "/inbox" },
  { id: "l5", text: "Answered Ethan’s question about package pricing", when: "Sun", brand: "messenger", href: "/inbox" },
  { id: "l6", text: "Prepared 42 client follow-up emails for approval", when: "9:40 AM", brand: "gmail", href: "/approvals" },
  { id: "l7", text: "Logged Priya’s $1,550 payment", when: "Yesterday", brand: "stripe", href: "/clients/c05" },
];
