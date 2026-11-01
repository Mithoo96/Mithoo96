export const user = { name: "Smithou" };

export const today = {
  tasks: 8,
  approvals: 3,
  appointments: 2,
  summary: "Your business needs you in 3 places today.",
};

export const quickActions = [
  { key: "clients", title: "Clients", note: "12 need attention" },
  { key: "messages", title: "Messages", note: "5 waiting" },
  { key: "create", title: "Create", note: "Turn an idea into content" },
  { key: "reports", title: "Reports", note: "See how your business is doing" },
] as const;

export const approvals = [
  { key: "campaign", title: "Campaign Ready", meta: "$300 budget" },
  { key: "followups", title: "42 Client Follow-ups", meta: "Ready" },
  { key: "social", title: "Social Post", meta: "Instagram + Facebook" },
] as const;

export const aiActivity = [
  { count: 14, label: "reminders sent" },
  { count: 3, label: "appointments confirmed" },
  { count: 7, label: "leads followed up" },
  { count: 2, label: "questions answered" },
];

export const launch = {
  subtitle: "Here’s what happened while you were away.",
  handledCount: 14,
};
