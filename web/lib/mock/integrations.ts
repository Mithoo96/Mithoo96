import type { Integration, Campaign } from "@/lib/types";

const i = (id: Integration["id"], name: string, kind: string, category: Integration["category"], state: Integration["state"], description: string, scopes: string[]): Integration =>
  ({ id, name, kind, category, state, description, scopes });

export const integrations: Integration[] = [
  i("gmail", "Gmail", "Email", "Communication", "connected", "Send and receive client email from the Inbox.", ["Read and send email", "Create drafts for your approval"]),
  i("googlecalendar", "Google Calendar", "Scheduling", "Productivity", "connected", "Keep appointments in sync both ways.", ["View and edit events", "See availability"]),
  i("meta", "Meta", "Marketing", "Marketing", "connected", "Run and track Instagram and Facebook ads.", ["Manage ad campaigns", "Read ad performance"]),
  i("stripe", "Stripe", "Payments", "Payments", "connected", "Track payments, invoices and refunds.", ["Read payments", "Create invoices and refunds"]),
  i("instagram", "Instagram", "Social", "Marketing", "connected", "Publish posts and answer DMs.", ["Publish content", "Read and reply to messages"]),
  i("whatsapp", "WhatsApp", "Messaging", "Communication", "available", "Message clients on WhatsApp Business.", ["Send and receive messages", "Use approved templates"]),
  i("facebook", "Facebook", "Social", "Marketing", "available", "Publish to your Page and reply to Messenger.", ["Publish to your Page", "Read and reply to messages"]),
  i("tiktok", "TikTok", "Social", "Marketing", "available", "Publish videos and track views.", ["Publish videos", "Read video analytics"]),
  i("youtube", "YouTube", "Video", "Marketing", "soon", "Upload videos and Shorts.", []),
  i("googledrive", "Google Drive", "Files", "Productivity", "available", "Store client documents in Drive.", ["Create and read files in a Mithoo folder"]),
  i("highlevel", "HighLevel", "CRM", "CRM", "available", "Import contacts, pipelines and history.", ["Read contacts", "Read pipelines and opportunities"]),
  i("quickbooks", "QuickBooks", "Accounting", "Accounting", "soon", "Sync invoices and expenses.", []),
  i("slack", "Slack", "Team chat", "Communication", "available", "Get approvals and alerts in Slack.", ["Post messages", "Receive approval actions"]),
  i("zoom", "Zoom", "Video calls", "Communication", "available", "Add Zoom links to online appointments.", ["Create meetings"]),
  i("shopify", "Shopify", "Store", "Payments", "available", "Sell packages and products online.", ["Read orders", "Read products"]),
  i("wordpress", "WordPress", "Website", "Marketing", "available", "Capture website form leads.", ["Receive form submissions"]),
  i("openai", "OpenAI", "AI model", "AI", "soon", "Use OpenAI models for content generation.", []),
  i("claude", "Claude", "AI model", "AI", "soon", "Use Claude for writing and analysis.", []),
];

export const campaigns: Campaign[] = [
  { id: "cp1", name: "Fall reactivation", status: "pending", brands: ["instagram", "facebook"], leads: 0, spend: 0, budget: 300 },
  { id: "cp2", name: "New client offer", status: "live", brands: ["instagram", "facebook", "tiktok"], leads: 23, spend: 298, budget: 450 },
  { id: "cp3", name: "Membership spotlight", status: "ended", brands: ["instagram"], leads: 11, spend: 180, budget: 180 },
];
