import { Package, Home, Users, FolderOpen, Briefcase, Sparkles, Inbox, ChartLine, LayoutGrid, Settings, Truck, ShoppingBag, Plug, type LucideIcon } from "lucide-react";
import type { Workspace } from "@/server/auth/workspace";
import { workspaceRouteEnabled, workspaceRoleRouteEnabled } from "@/core/tenancy/modules";

export type NavItem = { label: string; icon: LucideIcon; href: string; match: string[] };
export const mainNav: NavItem[] = [
  { label: "Home", icon: Home, href: "/", match: ["/"] },
  { label: "Orders", icon: Package, href: "/orders", match: ["/orders"] },
  { label: "Products", icon: ShoppingBag, href: "/products", match: ["/products"] },
  { label: "Clients", icon: Users, href: "/clients", match: ["/clients"] },
  { label: "Documents", icon: FolderOpen, href: "/documents", match: ["/documents"] },
  { label: "Work", icon: Briefcase, href: "/work", match: ["/work"] },
  { label: "Shipping", icon: Truck, href: "/shipping", match: ["/shipping"] },
  { label: "Customers", icon: Users, href: "/customers", match: ["/customers"] },
  { label: "Create", icon: Sparkles, href: "/create", match: ["/create"] },
  { label: "Inbox", icon: Inbox, href: "/inbox", match: ["/inbox"] },
  { label: "Insights", icon: ChartLine, href: "/insights", match: ["/insights"] },
  { label: "Integrations", icon: Plug, href: "/integrations", match: ["/integrations"] },
];
export function visibleNav(items: readonly NavItem[], workspace: Workspace) {
  return items.filter((item) => workspaceRouteEnabled(workspace.profile.organization, item.href)
    && workspaceRoleRouteEnabled(workspace.profile.viewer.role, item.href)
    && !(workspace.profile.viewer.role === "EMPLOYEE" && item.href === "/orders"));
}
export const bottomNav: NavItem[] = [
  { label: "Apps", icon: LayoutGrid, href: "/apps", match: ["/apps"] },
  { label: "Settings", icon: Settings, href: "/settings", match: ["/settings"] },
];
export const isActive = (item: NavItem, path: string) => item.match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(m + "/")));
