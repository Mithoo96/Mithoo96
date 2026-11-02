import type { Notification, AiActivity } from "@/lib/types";

export const notifications: Notification[] = [
  { id: "n1", kind: "action", title: "Insurance application ready for review", body: "Tamika Johnson · Final Expense", time: "35m ago", href: "/approvals", read: false },
  { id: "n2", kind: "action", title: "Tax client missing documents", body: "Jean Pierre · W-2 and 1099", time: "8:12 AM", href: "/clients/c01", read: false, brand: "whatsapp" },
  { id: "n3", kind: "action", title: "Campaign awaiting approval", body: "Life insurance leads · $300", time: "2h ago", href: "/approvals", read: false, brand: "meta" },
  { id: "n4", kind: "important", title: "New Facebook lead: Kevin Charles", body: "Term Life · requested a quote", time: "40m ago", href: "/clients/c03", read: false, brand: "facebook" },
  { id: "n5", kind: "important", title: "Return ready for final review", body: "Ricardo Alvarez · business return", time: "3h ago", href: "/approvals", read: true },
  { id: "n6", kind: "ai", title: "Appointment confirmed", body: "Andre Williams · Needs Analysis, 1:30 PM", time: "7:15 AM", read: true, brand: "googlecalendar" },
  { id: "n7", kind: "ai", title: "AI completed 12 follow-ups", body: "Insurance leads from the last 48 hours", time: "8:00 AM", read: true, brand: "gmail" },
  { id: "n8", kind: "ai", title: "Payment received", body: "Linda Dorsainvil · tax preparation fee", time: "Yesterday", read: true, brand: "stripe" },
];

export const aiActivityLog: AiActivity[] = [
  { id: "l1", mode: "all", text: "Prepared 12 follow-up emails for new leads", when: "8:00 AM", brand: "gmail", href: "/approvals" },
  { id: "l2", mode: "all", text: "Confirmed 3 appointments for today and tomorrow", when: "7:15 AM", brand: "googlecalendar", href: "/appointments" },
  { id: "l3", mode: "all", text: "Prepared 8 appointment and document reminders", when: "7:00 AM", brand: "whatsapp", href: "/inbox" },
  { id: "l4", mode: "insurance", text: "Captured 6 leads from the Facebook lead form", when: "Overnight", brand: "meta", href: "/clients?filter=insurance" },
  { id: "l5", mode: "insurance", text: "Organized 2 insurance applications for review", when: "9:10 AM", href: "/approvals" },
  { id: "l6", mode: "tax", text: "Prepared 4 tax document reminders", when: "7:05 AM", brand: "whatsapp", href: "/documents" },
  { id: "l7", mode: "tax", text: "Sorted 9 uploaded tax documents into client folders", when: "6:40 AM", brand: "googledrive", href: "/documents" },
  { id: "l8", mode: "insurance", text: "Answered Rose-Marie's question on Instagram and booked a consultation", when: "7:59 AM", brand: "instagram", href: "/inbox" },
];
