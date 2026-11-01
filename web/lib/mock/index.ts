// Single entry point for all mock data. Replace these exports with API calls later.
export { business } from "@/lib/config/business";
export * from "./clients";
export * from "./team";
export * from "./tasks";
export * from "./appointments";
export * from "./messages";
export * from "./approvals";
export * from "./reports";
export * from "./notifications";
export * from "./integrations";
export * from "./documents";
export * from "./dashboard";
export { launchSummary as launch } from "./dashboard";
// Convenience views
import { clients } from "./clients";
export const taxClients = clients.filter((c) => c.lines.includes("tax"));
export const insuranceClients = clients.filter((c) => c.lines.includes("insurance"));
export const leads = clients.filter((c) => c.status === "new");
