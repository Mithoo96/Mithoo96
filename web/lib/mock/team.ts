import type { TeamMember, Role } from "@/lib/types";

export const team: TeamMember[] = [
  { id: "u1", name: "Smithou Laurent", role: "Owner", email: "smithou@smithouwellness.com", status: "active" },
  { id: "u2", name: "Clara Dupont", role: "Manager", email: "clara@smithouwellness.com", status: "active" },
  { id: "u3", name: "Leo Martins", role: "Staff", email: "leo@smithouwellness.com", status: "active" },
  { id: "u4", name: "Nadia Haddad", role: "Marketing", email: "nadia@smithouwellness.com", status: "active" },
  { id: "u5", name: "Sam Rivera", role: "Staff", email: "sam@smithouwellness.com", status: "invited" },
];

export const permissionAreas = ["Clients", "Documents", "Marketing", "Finance", "Reports", "Settings"] as const;
export const roles: Role[] = ["Owner", "Manager", "Staff", "Marketing"];
export const defaultPermissions: Record<Role, Record<(typeof permissionAreas)[number], boolean>> = {
  Owner: { Clients: true, Documents: true, Marketing: true, Finance: true, Reports: true, Settings: true },
  Manager: { Clients: true, Documents: true, Marketing: true, Finance: true, Reports: true, Settings: false },
  Staff: { Clients: true, Documents: true, Marketing: false, Finance: false, Reports: false, Settings: false },
  Marketing: { Clients: false, Documents: false, Marketing: true, Finance: false, Reports: true, Settings: false },
};
