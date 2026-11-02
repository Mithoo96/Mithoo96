import type { Integration, Campaign } from "@/lib/types";

const i = (id: Integration["id"], name: string, kind: string, category: Integration["category"], state: Integration["state"], description: string, scopes: string[]): Integration =>
  ({ id, name, kind, category, state, description, scopes });

export const integrations: Integration[] = [
  i("gmail", "Gmail", "Email", "Communication", "connected", "Send client emails and document requests from the Inbox.", ["Read and send email", "Create drafts for your approval"]),
  i("googlecalendar", "Google Calendar", "Scheduling", "Productivity", "connected", "Keep appointments in sync both ways.", ["View and edit events", "See availability"]),
  i("meta", "Meta", "Marketing", "Marketing", "connected", "Run lead campaigns and capture Facebook lead forms.", ["Manage ad campaigns", "Read ad performance"]),
  i("stripe", "Stripe", "Payments", "Payments", "connected", "Collect tax preparation fees and track premiums.", ["Read payments", "Create invoices and refunds"]),
  i("instagram", "Instagram", "Social", "Marketing", "connected", "Publish posts and answer DMs.", ["Publish content", "Read and reply to messages"]),
  i("whatsapp", "WhatsApp", "Messaging", "Communication", "connected", "Message clients on WhatsApp Business.", ["Send and receive messages", "Use approved templates"]),
  i("facebook", "Facebook", "Social", "Marketing", "available", "Publish to your Page and reply to Messenger.", ["Publish to your Page", "Read and reply to messages"]),
  i("tiktok", "TikTok", "Social", "Marketing", "available", "Publish videos and track views.", ["Publish videos", "Read video analytics"]),
  i("youtube", "YouTube", "Video", "Marketing", "soon", "Upload videos and Shorts.", []),
  i("googledrive", "Google Drive", "Files", "Productivity", "available", "Store tax documents and applications in client folders.", ["Create and read files in a Mithoo folder"]),
  i("highlevel", "HighLevel", "CRM", "CRM", "available", "Import leads, pipelines and conversation history.", ["Read contacts", "Read pipelines and opportunities"]),
  i("quickbooks", "QuickBooks", "Accounting", "Accounting", "soon", "Sync preparation fees and agency expenses.", []),
  i("slack", "Slack", "Team chat", "Communication", "available", "Get approvals and alerts in Slack.", ["Post messages", "Receive approval actions"]),
  i("zoom", "Zoom", "Video calls", "Communication", "available", "Add Zoom links to online appointments.", ["Create meetings"]),
  i("openai", "OpenAI", "AI model", "AI", "soon", "Use OpenAI models for content generation.", []),
  i("claude", "Claude", "AI model", "AI", "soon", "Use Claude for writing and analysis.", []),
];

export const campaigns: Campaign[] = [
  { id: "cp1", name: "Life insurance leads", line: "insurance", status: "pending", brands: ["instagram", "facebook"], leads: 0, spend: 0, budget: 300 },
  { id: "cp2", name: "Final Expense · Broward", line: "insurance", status: "live", brands: ["facebook", "instagram"], leads: 23, spend: 246, budget: 400 },
  { id: "cp3", name: "Early tax filers", line: "tax", status: "ended", brands: ["instagram", "whatsapp"], leads: 31, spend: 180, budget: 180 },
];
