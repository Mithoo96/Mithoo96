import "server-only";
import {cookies} from "next/headers";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOrgRole, type OrgRole } from "@/core/tenancy/permissions";
import { toWorkspaceProfile, type WorkspaceProfile } from "@/server/adapters/prototype";

export interface Workspace {
  profile: WorkspaceProfile;
  memberships: { organizationId: string; role: OrgRole; name: string }[];
  extraPermissions: string[];
}

/** Every lookup uses the verified user's cookie-bound client, with RLS. */
export async function resolveWorkspace(client: SupabaseClient,selectedOrganizationId?:string): Promise<Workspace | null> {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const [membership, profile, admin] = await Promise.all([
    client.from("organization_members").select("organization_id,role,status,extra_permissions,organizations(id,name,slug,timezone,metadata,status)").eq("user_id", user.id).eq("status", "ACTIVE").order("created_at").order("organization_id"),
    client.from("profiles").select("display_name,full_name,avatar_url").eq("id", user.id).maybeSingle(),
    client.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (membership.error || profile.error || admin.error) throw new Error("Workspace could not be loaded. Please try again.");
  const memberships = (membership.data ?? []).flatMap((m) => {
    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    return m.status === "ACTIVE" && org && org.status === "ACTIVE" && isOrgRole(m.role) ? [{ org, role: m.role, extra: (m.extra_permissions as string[] | null) ?? [] }] : [];
  });
  // Deterministic active membership, never a client-provided org or role.
  const selected = memberships.find(m=>m.org.id===selectedOrganizationId) ?? memberships[0];
  const org = selected?.org;
  const role = selected?.role ?? (admin.data ? "PLATFORM_ADMIN" : "NO_MEMBERSHIP");
  return {
    profile: toWorkspaceProfile(org ?? { id: "", name: "Mithoo Business OS", slug: "", timezone: "UTC", metadata: {} }, profile.data, user.id, role),
    memberships: memberships.map((m) => ({ organizationId: m.org.id, name: m.org.name, role: m.role })),
    extraPermissions: selected?.extra ?? [],
  };
}

export const getWorkspace = cache(async () => {
  const client = await createSupabaseServerClient();
  const workspace = await resolveWorkspace(client,(await cookies()).get("mithoo_workspace")?.value);
  if (!workspace) redirect("/login");
  if (!workspace.profile.organization.id && workspace.profile.viewer.role !== "PLATFORM_ADMIN") redirect("/onboarding");
  return { client, workspace };
});
