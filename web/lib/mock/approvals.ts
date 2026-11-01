import type { Approval } from "@/lib/types";

export const approvals: Approval[] = [
  { id: "ap1", title: "Meta Campaign", meta: "$300 budget · Ready for review", category: "marketing", status: "pending", brands: ["meta", "instagram", "facebook"],
    summary: "Life insurance lead campaign for families in Broward and Miami-Dade, promoting Term Life and Final Expense.", requestedBy: "Tasha Morgan", when: "2h ago",
    details: [{ label: "Budget", value: "$300" }, { label: "Duration", value: "10 days" }, { label: "Platforms", value: "Instagram + Facebook" }, { label: "Expected leads", value: "20–28" }] },
  { id: "ap2", title: "42 Client Follow-ups", meta: "Ready", category: "communication", status: "pending", brands: ["gmail", "whatsapp"],
    summary: "Personal messages to last year's tax clients who haven't scheduled for this season.", requestedBy: "Mithoo AI", when: "1h ago",
    details: [{ label: "Recipients", value: "42 clients" }, { label: "Channels", value: "Email + WhatsApp" }, { label: "Send time", value: "Tomorrow, 9:00 AM" }] },
  { id: "ap3", title: "Insurance Application", meta: "Tamika Johnson · Needs review", category: "insurance", status: "pending",
    summary: "Final Expense application, $15,000 face amount. Beneficiary section needs confirmation before submitting to the carrier.", requestedBy: "Jonathan Belizaire", when: "35m ago",
    details: [{ label: "Product", value: "Final Expense" }, { label: "Face amount", value: "$15,000" }, { label: "Monthly premium", value: "$58.40" }, { label: "Open item", value: "Beneficiary for a minor" }] },
  { id: "ap4", title: "Tax Return", meta: "Ricardo Alvarez · Ready for final review", category: "tax", status: "pending",
    summary: "Business return (Schedule C) with vehicle depreciation. Claudette flagged one question for you.", requestedBy: "Claudette Remy", when: "3h ago",
    details: [{ label: "Return type", value: "Business (Schedule C)" }, { label: "Estimated refund", value: "$2,140" }, { label: "Preparer", value: "Claudette Remy" }, { label: "Flag", value: "Vehicle depreciation" }] },
  { id: "ap5", title: "Tax Season Social Post", meta: "Instagram + Facebook", category: "marketing", status: "pending", brands: ["instagram", "facebook"],
    summary: "“Tax season is coming. Book early and skip the rush.” carousel with booking link.", requestedBy: "Tasha Morgan", when: "Yesterday",
    details: [{ label: "Format", value: "Carousel · 4 slides" }, { label: "Scheduled", value: "Mon, 12:00 PM" }] },
  { id: "ap6", title: "Appointment reminders", meta: "SMS to 18 clients", category: "communication", status: "approved", brands: ["whatsapp"],
    summary: "Reminders for this week's consultations.", requestedBy: "Mithoo AI", when: "Yesterday", details: [{ label: "Recipients", value: "18 clients" }] },
  { id: "ap7", title: "Amended return", meta: "Stephanie Louis", category: "tax", status: "rejected",
    summary: "Not needed. The IRS corrected the math error automatically.", requestedBy: "Claudette Remy", when: "3 days ago", details: [{ label: "Reason", value: "IRS math correction" }] },
];
