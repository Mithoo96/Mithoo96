import type { Client, ClientDocument, Payment, TimelineEvent, Note, LineKey, DocStatus } from "@/lib/types";
import { business } from "@/lib/config/business";

const T = business.lines.tax.stages, I = business.lines.insurance.stages;
type Opt = { tax?: string; ins?: string; product?: string; service: string; status: Client["status"]; value: number; last: string; next: string; source: string; since: string; city: string };
const c = (id: string, name: string, o: Opt): Client => {
  const lines: LineKey[] = [...(o.tax ? ["tax" as const] : []), ...(o.ins ? ["insurance" as const] : [])];
  const [first, ...rest] = name.toLowerCase().replace(/[^a-z\s-]/g, "").split(" ");
  return { id, name, lines, status: o.status, service: o.service, taxStage: o.tax, insuranceStage: o.ins, product: o.product, value: o.value, lastContact: o.last, nextAction: o.next,
    source: o.source, since: o.since, city: o.city, email: `${first}.${rest.join("")}@email.com`, phone: `(555) 214-${id.slice(1).padStart(4, "0")}` };
};

export const clients: Client[] = [
  c("c01", "Jean Pierre", { tax: T[2], service: "Individual Tax Return", status: "attention", value: 350, last: "2 days ago", next: "W-2 and 1099 still missing", source: "Referral", since: "Jan 2024", city: "North Miami" }),
  c("c02", "Marie-Claude Joseph", { tax: T[4], ins: I[7], product: "Whole Life", service: "Tax + Whole Life", status: "active", value: 2850, last: "Yesterday", next: "Return in preparation", source: "Referral", since: "Feb 2023", city: "Miramar" }),
  c("c03", "Kevin Charles", { ins: I[0], product: "Term Life", service: "Term Life", status: "new", value: 960, last: "40m ago", next: "Call within 1 hour", source: "Facebook ad", since: "Today", city: "Pembroke Pines" }),
  c("c04", "Nadine Baptiste", { ins: I[5], product: "IUL", service: "IUL", status: "waiting", value: 4200, last: "3 days ago", next: "Waiting on underwriting", source: "Instagram", since: "Sep 2026", city: "Fort Lauderdale" }),
  c("c05", "Ricardo Alvarez", { tax: T[5], service: "Business Tax Return", status: "active", value: 1250, last: "Today", next: "Return ready for final review", source: "Google", since: "Mar 2022", city: "Hialeah" }),
  c("c06", "Tamika Johnson", { ins: I[4], product: "Final Expense", service: "Final Expense", status: "attention", value: 720, last: "Yesterday", next: "Application needs review", source: "Facebook ad", since: "Oct 2026", city: "Miami Gardens" }),
  c("c07", "Samuel Etienne", { tax: T[1], service: "Individual Tax Return", status: "new", value: 300, last: "3h ago", next: "Finish intake questionnaire", source: "Website", since: "Today", city: "North Miami Beach" }),
  c("c08", "Linda Dorsainvil", { tax: T[7], ins: I[7], product: "Living Benefits", service: "Tax + Living Benefits", status: "completed", value: 3100, last: "2 weeks ago", next: "Policy review in March", source: "Referral", since: "Apr 2021", city: "Miramar" }),
  c("c09", "Marcus Green", { ins: I[3], product: "Term Life", service: "Term Life", status: "active", value: 1080, last: "Today", next: "Follow up on quote", source: "Website", since: "Oct 2026", city: "Hollywood" }),
  c("c10", "Fabiola Celestin", { tax: T[2], service: "Individual Tax Return", status: "waiting", value: 350, last: "4 days ago", next: "Waiting on Social Security card", source: "WhatsApp", since: "Nov 2025", city: "Little Haiti" }),
  c("c11", "Andre Williams", { ins: I[2], product: "Whole Life", service: "Whole Life", status: "active", value: 2400, last: "Yesterday", next: "Needs analysis Thursday", source: "Referral", since: "Oct 2026", city: "Coral Springs" }),
  c("c12", "Guerline Augustin", { tax: T[3], service: "Individual Tax Return", status: "active", value: 350, last: "Today", next: "Start preparation", source: "Referral", since: "Feb 2024", city: "North Miami" }),
  c("c13", "Daniel Moreau", { ins: I[1], product: "IUL", service: "IUL", status: "attention", value: 3600, last: "3 days ago", next: "No contact in 72 hours", source: "Instagram", since: "Oct 2026", city: "Weston" }),
  c("c14", "Stephanie Louis", { tax: T[6], service: "Individual Tax Return", status: "active", value: 325, last: "1 week ago", next: "Refund tracking", source: "Website", since: "Jan 2025", city: "Miramar" }),
  c("c15", "Patrick Desir", { tax: T[2], ins: I[0], product: "Term Life", service: "Tax + Term Life", status: "attention", value: 1400, last: "5 days ago", next: "Missing previous tax return", source: "Referral", since: "Dec 2024", city: "Boca Raton" }),
  c("c16", "Carmen Rodriguez", { ins: I[6], product: "Final Expense", service: "Final Expense", status: "active", value: 840, last: "Yesterday", next: "Deliver approved policy", source: "Facebook ad", since: "Sep 2026", city: "Kendall" }),
  c("c17", "Wilner Jean-Baptiste", { tax: T[4], service: "Business Tax Return", status: "active", value: 1500, last: "2 days ago", next: "Reconcile business income", source: "Referral", since: "Mar 2023", city: "Fort Lauderdale" }),
  c("c18", "Angela Brooks", { ins: I[7], product: "Term Life", service: "Term Life", status: "completed", value: 1150, last: "1 month ago", next: "Annual policy review due", source: "Google", since: "Oct 2025", city: "Plantation" }),
  c("c19", "Rose-Marie Toussaint", { tax: T[0], service: "Tax Consultation", status: "new", value: 150, last: "1h ago", next: "Book consultation", source: "Instagram", since: "Today", city: "North Miami" }),
  c("c20", "Jamal Carter", { ins: I[4], product: "Living Benefits", service: "Living Benefits", status: "attention", value: 2100, last: "Yesterday", next: "Application needs signature", source: "Website", since: "Oct 2026", city: "Davie" }),
  c("c21", "Esther Philippe", { tax: T[7], service: "Individual Tax Return", status: "completed", value: 300, last: "3 weeks ago", next: "Offer life insurance review", source: "Referral", since: "Feb 2022", city: "Miramar" }),
  c("c22", "Michael Thompson", { ins: I[0], product: "Final Expense", service: "Final Expense", status: "new", value: 620, last: "2h ago", next: "First call", source: "Meta lead form", since: "Today", city: "Lauderhill" }),
];

const idx = (stages: readonly string[], s?: string) => (s ? stages.indexOf(s) : -1);

export function seedTimeline(cl: Client): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const add = (line: LineKey, kind: TimelineEvent["kind"], title: string, detail: string, when: string, by: TimelineEvent["by"], brand?: TimelineEvent["brand"]) =>
    ev.push({ id: `${cl.id}-${line}-${ev.length}`, line, kind, title, detail, when, by, brand });
  const ts = idx(T, cl.taxStage);
  if (ts >= 0) {
    add("tax", "lead", "Lead received", `From ${cl.source}`, cl.since === "Today" ? "Today, 8:40 AM" : cl.since, "client", cl.source.includes("Instagram") ? "instagram" : cl.source.includes("WhatsApp") ? "whatsapp" : undefined);
    if (ts >= 1) add("tax", "form", "Intake completed", "Filing status, dependents, income sources", "Same day", "client");
    if (ts >= 2) add("tax", "document", "W-2 requested", "Secure upload link sent", "Next day", "ai", "gmail");
    if (ts >= 2) add("tax", "reminder", "Reminder sent", "Missing documents reminder", "3 days later", "ai", "whatsapp");
    if (ts >= 3) add("tax", "document", "Documents received", "W-2, Photo ID, Social Security card", "5 days later", "client");
    if (ts >= 4) add("tax", "return", "Return in preparation", "Assigned to Claudette (Tax Preparer)", "6 days later", "team");
    if (ts >= 5) add("tax", "task", "Ready for final review", "Waiting on Moise", cl.lastContact, "team");
    if (ts >= 6) add("tax", "return", "Return filed", "E-filed with IRS", "Filed", "team");
    if (ts >= 7) add("tax", "payment", "Payment received", `$${cl.value.toLocaleString("en-US")} preparation fee`, "Paid", "client", "stripe");
  }
  const is = idx(I, cl.insuranceStage);
  if (is >= 0) {
    add("insurance", "lead", "Lead received", `${cl.product} · ${cl.source}`, cl.since === "Today" ? "Today, 9:05 AM" : cl.since, "client", cl.source.includes("Facebook") || cl.source.includes("Meta") ? "meta" : cl.source.includes("Instagram") ? "instagram" : undefined);
    if (is >= 1) add("insurance", "sms", "First contact", "Intro text and booking link", "Within 5 minutes", "ai", "whatsapp");
    if (is >= 2) add("insurance", "appointment", "Appointment booked", "Life Insurance Consultation", "Next day", "client", "googlecalendar");
    if (is >= 3) add("insurance", "form", "Needs analysis completed", "Income, dependents, coverage goals", "2 days later", "team");
    if (is >= 3) add("insurance", "quote", "Quote presented", `${cl.product} · 3 carrier options`, "3 days later", "team");
    if (is >= 4) add("insurance", "application", "Application submitted", `${cl.product} application`, "5 days later", "team");
    if (is >= 5) add("insurance", "application", "Underwriting pending", "Carrier reviewing medical information", "1 week later", "team");
    if (is >= 6) add("insurance", "application", "Policy approved", "Approved as applied", "2 weeks later", "team");
    if (is >= 7) add("insurance", "payment", "First premium received", "Policy is active", "Active", "client", "stripe");
  }
  return ev.reverse();
}

export function seedDocuments(cl: Client): ClientDocument[] {
  const docs: ClientDocument[] = [];
  const ts = idx(T, cl.taxStage), is = idx(I, cl.insuranceStage);
  if (ts >= 0) {
    const names = business.lines.tax.documents.filter((n) => n !== "Business Income Documents" || cl.service.includes("Business"));
    names.forEach((name, i) => {
      let status: DocStatus = ts >= 3 ? (ts === 3 && i === 0 ? "review" : "received") : ts === 2 ? (i < 2 ? (cl.status === "attention" ? "missing" : "requested") : i === 3 && cl.id === "c10" ? "requested" : i === 4 && cl.id === "c15" ? "missing" : "received") : "requested";
      if (ts <= 1) status = i < 3 ? "requested" : "missing";
      docs.push({ id: `${cl.id}-td${i}`, clientId: cl.id, line: "tax", name, status, date: status === "received" ? "Received" : status === "review" ? "Uploaded today" : status === "missing" ? "Overdue · 6 days" : "Requested 2 days ago", size: status === "received" || status === "review" ? `${120 + i * 70} KB` : undefined });
    });
  }
  if (is >= 0) {
    business.lines.insurance.documents.forEach((name, i) => {
      const needed = [4, 1, 4, 6, 4][i];
      const status: DocStatus = is >= needed ? "received" : is === needed - 1 ? (cl.status === "attention" ? "missing" : "requested") : is >= 3 && i === 2 ? "review" : "requested";
      if (is < 2 && i > 1) return;
      docs.push({ id: `${cl.id}-id${i}`, clientId: cl.id, line: "insurance", name, status, date: status === "received" ? "Received" : status === "review" ? "Under review" : status === "missing" ? "Overdue" : "Requested", size: status === "received" ? `${200 + i * 90} KB` : undefined });
    });
  }
  return docs;
}

export function seedPayments(cl: Client): Payment[] {
  const p: Payment[] = [];
  const ts = idx(T, cl.taxStage), is = idx(I, cl.insuranceStage);
  if (ts >= 3) p.push({ id: `${cl.id}-p1`, label: "Tax preparation fee", amount: cl.lines.length > 1 ? 350 : cl.value, status: ts >= 7 ? "paid" : "due", date: ts >= 7 ? "Paid via Stripe" : "Due at filing" });
  if (is >= 7) p.push({ id: `${cl.id}-p2`, label: `${cl.product} · monthly premium`, amount: Math.round((cl.value - (ts >= 0 ? 350 : 0)) / 12), status: "paid", date: "Autopay · Stripe" });
  if (is === 6) p.push({ id: `${cl.id}-p3`, label: `${cl.product} · first premium`, amount: Math.round(cl.value / 12), status: "due", date: "Due at policy delivery" });
  return p;
}

export const seedNotes = (cl: Client): Note[] => [
  { id: `${cl.id}-n1`, text: cl.lines.includes("insurance") ? `Interested in ${cl.product}. Prefers calls after 5 PM.` : "Prefers WhatsApp. Usually sends documents on weekends.", when: "2 weeks ago", author: "Claudette Remy" },
];
