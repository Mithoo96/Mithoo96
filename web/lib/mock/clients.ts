import type { Client, ClientDocument, Payment, TimelineEvent, Note } from "@/lib/types";

const c = (id: string, name: string, status: Client["status"], service: string, value: number, lastActivity: string, nextStep: string, source: string, since: string, city: string, tags: string[] = []): Client => ({
  id, name, status, service, value, lastActivity, nextStep, source, since, city, tags,
  email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@email.com`,
  phone: `(415) 555-01${id.slice(-2)}`,
});

export const clients: Client[] = [
  c("c01", "Amelia Chen", "attention", "Treatment Plan", 2400, "2h ago", "Insurance card still missing", "Instagram ad", "Aug 2026", "San Francisco", ["VIP"]),
  c("c02", "Marcus Bell", "new", "Consultation", 350, "35m ago", "Reply to pricing question", "Website form", "Today", "Oakland"),
  c("c03", "Sofia Ramirez", "active", "Membership", 1200, "Yesterday", "Check-in today at 10:30 AM", "Referral", "Mar 2026", "San Francisco", ["Member"]),
  c("c04", "James Okafor", "waiting", "Follow-up Session", 480, "3 days ago", "Waiting on lab results", "Google", "Jun 2026", "Berkeley"),
  c("c05", "Priya Nair", "active", "Treatment Plan", 3100, "4h ago", "Session today at 3:00 PM", "Referral", "Jan 2026", "San Francisco", ["VIP"]),
  c("c06", "Lucas Martin", "attention", "Wellness Package", 960, "1 week ago", "Invoice 12 days overdue", "Facebook", "Apr 2026", "Daly City"),
  c("c07", "Hannah Weiss", "new", "Consultation", 350, "1h ago", "Book first consultation", "Instagram ad", "Today", "San Mateo"),
  c("c08", "Daniel Kim", "completed", "Treatment Plan", 2800, "2 weeks ago", "Ask for a review", "Google", "Nov 2025", "San Francisco"),
  c("c09", "Olivia Brooks", "waiting", "Consultation", 350, "2 days ago", "Waiting on intake form", "Website form", "Oct 2026", "Palo Alto"),
  c("c10", "Noah Fischer", "attention", "Follow-up Session", 480, "5 days ago", "Missed last appointment", "Referral", "Jul 2026", "San Francisco"),
  c("c11", "Emma Laurent", "active", "Membership", 1200, "Yesterday", "Renewal due in 9 days", "Instagram", "Feb 2026", "Sausalito", ["Member"]),
  c("c12", "Ethan Moreau", "new", "Wellness Package", 960, "3h ago", "Send package details", "TikTok", "Today", "San Francisco"),
  c("c13", "Grace Thompson", "active", "Treatment Plan", 2400, "6h ago", "Progress review next week", "Referral", "May 2026", "Oakland"),
  c("c14", "Mateo Rossi", "waiting", "Wellness Package", 960, "4 days ago", "Waiting on signed consent", "Facebook", "Sep 2026", "San Francisco"),
  c("c15", "Isabella Novak", "completed", "Consultation", 350, "3 weeks ago", "Offer membership", "Website form", "Aug 2026", "Berkeley"),
  c("c16", "Leo Dubois", "active", "Follow-up Session", 480, "2 days ago", "Next session Thursday", "Google", "Jul 2026", "San Francisco"),
];

export function seedTimeline(cl: Client): TimelineEvent[] {
  const ev: TimelineEvent[] = [
    { id: `${cl.id}-t1`, kind: "lead", title: "Lead received", detail: `From ${cl.source}`, when: cl.since === "Today" ? "Today, 8:12 AM" : `${cl.since}`, by: "client", brand: cl.source.includes("Instagram") ? "instagram" : cl.source === "Facebook" ? "facebook" : cl.source === "TikTok" ? "tiktok" : undefined },
    { id: `${cl.id}-t2`, kind: "form", title: "Form submitted", detail: "Intake questionnaire", when: "12 min later", by: "client" },
    { id: `${cl.id}-t3`, kind: "sms", title: "SMS sent", detail: "Welcome message and booking link", when: "Instantly", by: "ai" },
  ];
  if (cl.status === "new") return ev.reverse();
  ev.push(
    { id: `${cl.id}-t4`, kind: "appointment", title: "Appointment booked", detail: `${cl.service} · 45 min`, when: "Next day", by: "client", brand: "googlecalendar" },
    { id: `${cl.id}-t5`, kind: "document", title: "Document requested", detail: "Photo ID and insurance card", when: "2 days later", by: "ai", brand: "gmail" },
    { id: `${cl.id}-t6`, kind: "reminder", title: "Reminder sent", detail: "24 hours before appointment", when: "3 days later", by: "ai", brand: "whatsapp" },
  );
  if (cl.status !== "waiting") ev.push({ id: `${cl.id}-t7`, kind: "payment", title: "Payment received", detail: `$${Math.round(cl.value / 2).toLocaleString("en-US")} deposit`, when: cl.lastActivity, by: "client", brand: "stripe" });
  return ev.reverse();
}

export function seedDocuments(cl: Client): ClientDocument[] {
  return [
    { id: `${cl.id}-d1`, name: "Intake questionnaire.pdf", status: "received", date: "Received", size: "184 KB" },
    { id: `${cl.id}-d2`, name: "Photo ID.jpg", status: cl.status === "new" ? "requested" : "received", date: cl.status === "new" ? "Requested today" : "Received", size: cl.status === "new" ? undefined : "1.2 MB" },
    { id: `${cl.id}-d3`, name: "Insurance card", status: cl.status === "attention" ? "overdue" : cl.status === "waiting" ? "requested" : "received", date: cl.status === "attention" ? "Overdue · 6 days" : cl.status === "waiting" ? "Requested 2 days ago" : "Received" },
    { id: `${cl.id}-d4`, name: "Treatment consent.pdf", status: cl.id === "c14" ? "requested" : "received", date: cl.id === "c14" ? "Requested 4 days ago" : "Signed", size: "96 KB" },
  ];
}

export function seedPayments(cl: Client): Payment[] {
  if (cl.status === "new") return [];
  const half = Math.round(cl.value / 2);
  return [
    { id: `${cl.id}-p1`, label: `${cl.service} · deposit`, amount: half, status: "paid", date: "Paid via Stripe" },
    { id: `${cl.id}-p2`, label: `${cl.service} · balance`, amount: cl.value - half, status: cl.id === "c06" ? "overdue" : cl.status === "completed" ? "paid" : "due", date: cl.id === "c06" ? "12 days overdue" : cl.status === "completed" ? "Paid" : "Due in 14 days" },
  ];
}

export const seedNotes = (cl: Client): Note[] => [
  { id: `${cl.id}-n1`, text: `Prefers text messages over calls. Came in through ${cl.source.toLowerCase()}.`, when: "2 weeks ago", author: "Clara Dupont" },
];
