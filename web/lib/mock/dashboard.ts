import type { BusinessMode } from "@/lib/config/business";
import type { BrandKey } from "@/components/brand-icon";

/** Summary numbers for the dashboard. In production these come from reporting queries. */
type Stat = { label: string; value: number; href: string };
type Attention = { title: string; detail: string; href: string; brand?: BrandKey; tone: "rose" | "amber" | "violet" };
type Handled = { count: number; label: string; brand?: BrandKey };

export const dashboard: Record<BusinessMode, { stats: Stat[]; attention: Attention[]; handled: Handled[] }> = {
  all: {
    stats: [{ label: "New Leads", value: 18, href: "/clients?filter=new" }, { label: "Follow-ups", value: 7, href: "/work" }, { label: "Appointments", value: 5, href: "/appointments" }, { label: "Applications Pending", value: 3, href: "/approvals" }],
    attention: [
      { title: "4 Tax Clients Missing Documents", detail: "W-2s, 1099s and one previous return", href: "/documents", tone: "rose" },
      { title: "9 Insurance Leads Need Follow-up", detail: "No contact in the last 48 hours", href: "/clients?filter=insurance", brand: "meta", tone: "amber" },
      { title: "2 Insurance Applications Need Review", detail: "Tamika Johnson, Jamal Carter", href: "/approvals", tone: "amber" },
      { title: "1 Campaign Needs Approval", detail: "Life insurance leads · $300", href: "/approvals", brand: "meta", tone: "violet" },
    ],
    handled: [{ count: 12, label: "follow-ups prepared", brand: "gmail" }, { count: 3, label: "appointments confirmed", brand: "googlecalendar" }, { count: 8, label: "reminders prepared", brand: "whatsapp" }, { count: 6, label: "leads captured", brand: "meta" }],
  },
  tax: {
    stats: [{ label: "Active Tax Clients", value: 43, href: "/clients?filter=tax" }, { label: "Waiting for Documents", value: 12, href: "/documents" }, { label: "In Preparation", value: 17, href: "/work" }, { label: "Ready for Review", value: 6, href: "/approvals" }],
    attention: [
      { title: "4 Tax Clients Missing Documents", detail: "Jean Pierre, Patrick Desir and 2 more", href: "/documents", tone: "rose" },
      { title: "1 Return Ready for Final Review", detail: "Ricardo Alvarez · business return", href: "/approvals", tone: "amber" },
      { title: "21 Past Clients Not Yet Contacted", detail: "Upcoming tax season", href: "/create/campaign?preset=tax-season", tone: "violet" },
    ],
    handled: [{ count: 4, label: "document reminders prepared", brand: "whatsapp" }, { count: 9, label: "documents organized", brand: "googledrive" }, { count: 2, label: "consultations booked", brand: "googlecalendar" }, { count: 5, label: "client questions answered", brand: "gmail" }],
  },
  insurance: {
    stats: [{ label: "New Leads", value: 11, href: "/clients?filter=insurance" }, { label: "Appointments", value: 3, href: "/appointments" }, { label: "Quotes", value: 7, href: "/clients?filter=insurance" }, { label: "Applications", value: 4, href: "/approvals" }],
    attention: [
      { title: "9 Insurance Leads Need Follow-up", detail: "No contact in the last 48 hours", href: "/clients?filter=insurance", brand: "meta", tone: "rose" },
      { title: "2 Applications Need Review", detail: "Beneficiary and signature items", href: "/approvals", tone: "amber" },
      { title: "6 Clients Due for Policy Review", detail: "Policies older than 12 months", href: "/clients?filter=insurance", tone: "violet" },
    ],
    handled: [{ count: 6, label: "leads captured", brand: "meta" }, { count: 9, label: "first-contact messages sent", brand: "whatsapp" }, { count: 2, label: "applications organized" }, { count: 3, label: "consultations confirmed", brand: "googlecalendar" }],
  },
};

export const pipelines = {
  tax: [{ stage: "New Lead", count: 9 }, { stage: "Intake", count: 5 }, { stage: "Waiting for Documents", count: 12 }, { stage: "Documents Received", count: 7 }, { stage: "In Preparation", count: 17 }, { stage: "Review", count: 6 }, { stage: "Filed", count: 8 }, { stage: "Completed", count: 14 }],
  insurance: [{ stage: "New Lead", count: 11 }, { stage: "Contacted", count: 8 }, { stage: "Appointment", count: 5 }, { stage: "Quote", count: 7 }, { stage: "Application", count: 4 }, { stage: "Underwriting", count: 3 }, { stage: "Approved", count: 2 }, { stage: "Active Policy", count: 64 }],
};

export const kpis = {
  tax: [{ label: "New Tax Leads", value: 9 }, { label: "Active Tax Clients", value: 43 }, { label: "Waiting for Documents", value: 12 }, { label: "Returns In Preparation", value: 17 }, { label: "Ready for Review", value: 6 }, { label: "Completed Returns", value: 14 }],
  insurance: [{ label: "New Leads", value: 11 }, { label: "Appointments", value: 5 }, { label: "Quotes", value: 7 }, { label: "Applications", value: 4 }, { label: "Underwriting", value: 3 }, { label: "Approved Policies", value: 2 }, { label: "Active Policies", value: 64 }],
};

export const launchSummary = {
  subtitle: "Here’s what happened while you were away.",
  items: ["6 new insurance leads", "4 tax clients waiting for documents", "3 appointments scheduled", "2 applications need attention"],
  closing: "I’ve organized everything for you.",
};
