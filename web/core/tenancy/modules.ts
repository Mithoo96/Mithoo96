import { DomainError } from "@/core/errors";

export const ORGANIZATION_MODULES = ["CORE", "COMMERCE", "SHIPPING", "TEAM", "INTEGRATIONS", "CRM", "TAX", "INSURANCE", "MARKETING", "AI"] as const;
export const COMMERCE_CHANNELS = ["SHOPIFY", "TIKTOK_SHOP"] as const;
export type CommerceChannel = typeof COMMERCE_CHANNELS[number];
export type OrganizationModule = typeof ORGANIZATION_MODULES[number];
export interface ModuleAccess { enabledModules: OrganizationModule[]; enabledCommerceChannels: CommerceChannel[]; prototypeProfile: "doc-moise" | null }

/** Trusted organization metadata, never user_metadata, local storage or an organization-name switch. */
export function organizationModules(metadata: Record<string, unknown>): ModuleAccess {
  const configured = metadata.enabled_modules;
  const enabledModules = Array.isArray(configured)
    ? ORGANIZATION_MODULES.filter((key) => configured.includes(key)) : ["CORE" as const];
  const channels = metadata.commerce_channels;
  return { enabledModules, enabledCommerceChannels: Array.isArray(channels) ? COMMERCE_CHANNELS.filter((key) => channels.includes(key)) : [], prototypeProfile: metadata.prototype_profile === "doc-moise" ? "doc-moise" : null };
}
export function hasModules(access: ModuleAccess, required: readonly OrganizationModule[]) {
  return required.every((key) => access.enabledModules.includes(key));
}
export function requireModules(access: ModuleAccess, required: readonly OrganizationModule[]) {
  if (!hasModules(access, required)) throw new DomainError("FORBIDDEN", "This module is not enabled for your organization");
}
/** The preserved legacy prototype mixes tax and insurance; enabling just one cannot expose both. */
export function hasDocMoisePrototype(access: ModuleAccess) {
  return access.prototypeProfile === "doc-moise" && hasModules(access, ["CORE", "CRM", "TAX", "INSURANCE"]);
}
export function workspaceRouteEnabled(access: ModuleAccess, path: string): boolean {
  const root = "/" + (path.split("?")[0].split("/").filter(Boolean)[0] ?? "");
  if (root === "/" || root === "/settings") return hasModules(access, ["CORE"]);
  if (["/orders", "/work"].includes(root)) return hasModules(access, ["CORE", "COMMERCE", "SHIPPING", "TEAM"]);
  if (["/products", "/customers"].includes(root)) return hasModules(access, ["CORE", "COMMERCE"]);
  if (root === "/shipping") return hasModules(access, ["CORE", "COMMERCE", "SHIPPING"]);
  if (root === "/integrations") return hasModules(access, ["CORE", "COMMERCE", "INTEGRATIONS"]);
  if (root === "/inbox") return hasModules(access, ["CORE"]);
  if (root === "/insights") return hasDocMoisePrototype(access) || (path === "/insights" && hasModules(access, ["CORE", "COMMERCE", "SHIPPING", "TEAM"]));
  if (["/clients", "/documents", "/appointments", "/approvals", "/apps"].includes(root)) return hasDocMoisePrototype(access);
  if (root === "/create") return hasDocMoisePrototype(access) && hasModules(access, ["MARKETING"]);
  return false;
}
export function workspaceRoleRouteEnabled(role: string, path: string) {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role !== "EMPLOYEE") return path === "/" || path === "/settings";
  return path === "/" || ["/work", "/orders", "/inbox", "/settings"].some((root) => path === root || path.startsWith(root + "/"));
}
