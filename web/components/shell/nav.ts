import { Package, Home, Users, FolderOpen, Briefcase, Sparkles, Inbox, ChartLine, LayoutGrid, Settings, type LucideIcon } from "lucide-react";

export type NavItem = { label: string; icon: LucideIcon; href: string; match: string[] };
export const mainNav: NavItem[] = [
  { label: "Home", icon: Home, href: "/", match: ["/"] },
  { label: "Orders", icon: Package, href: "/orders", match: ["/orders"] },
  { label: "Clients", icon: Users, href: "/clients", match: ["/clients"] },
  { label: "Documents", icon: FolderOpen, href: "/documents", match: ["/documents"] },
  { label: "Work", icon: Briefcase, href: "/work", match: ["/work", "/approvals", "/appointments"] },
  { label: "Create", icon: Sparkles, href: "/create", match: ["/create"] },
  { label: "Inbox", icon: Inbox, href: "/inbox", match: ["/inbox"] },
  { label: "Insights", icon: ChartLine, href: "/insights", match: ["/insights"] },
];
export const bottomNav: NavItem[] = [
  { label: "Apps", icon: LayoutGrid, href: "/apps", match: ["/apps"] },
  { label: "Settings", icon: Settings, href: "/settings", match: ["/settings"] },
];
export const isActive = (item: NavItem, path: string) => item.match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(m + "/")));
