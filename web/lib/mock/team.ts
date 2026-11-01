import type { TeamMember, Role } from "@/lib/types";
import { business } from "@/lib/config/business";

export const team: TeamMember[] = [
  { id: "u1", name: business.owner.name, role: "Owner", email: business.owner.email, status: "active" },
  { id: "u2", name: "Claudette Remy", role: "Tax Preparer", email: "claudette@docmoise-demo.com", status: "active" },
  { id: "u3", name: "Jonathan Belizaire", role: "Insurance Agent", email: "jonathan@docmoise-demo.com", status: "active" },
  { id: "u4", name: "Sabrina Noel", role: "Manager", email: "sabrina@docmoise-demo.com", status: "active" },
  { id: "u5", name: "Tasha Morgan", role: "Marketing", email: "tasha@docmoise-demo.com", status: "active" },
  { id: "u6", name: "Ralph Antoine", role: "Staff", email: "ralph@docmoise-demo.com", status: "invited" },
];

export const permissionAreas = ["Clients", "Tax Documents", "Insurance Applications", "Marketing", "Finance", "Reports", "Settings"] as const;
export const roles = business.roles as unknown as Role[];
type Area = (typeof permissionAreas)[number];
const row = (...on: Area[]) => Object.fromEntries(permissionAreas.map((a) => [a, on.includes(a)])) as Record<Area, boolean>;
export const defaultPermissions: Record<Role, Record<Area, boolean>> = {
  Owner: row(...permissionAreas),
  Manager: row("Clients", "Tax Documents", "Insurance Applications", "Marketing", "Finance", "Reports"),
  "Tax Preparer": row("Clients", "Tax Documents", "Reports"),
  "Insurance Agent": row("Clients", "Insurance Applications", "Reports"),
  Marketing: row("Marketing", "Reports"),
  Staff: row("Clients"),
};
