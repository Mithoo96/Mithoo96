import "server-only";
import { notFound } from "next/navigation";
import { getWorkspace } from "./workspace";
import { workspaceRouteEnabled, workspaceRoleRouteEnabled } from "@/core/tenancy/modules";

/** Page loaders call this BEFORE importing any module's prototype or reading its data. */
export async function getWorkspaceForRoute(path: string) {
  const session = await getWorkspace();
  if (!workspaceRouteEnabled(session.workspace.profile.organization, path) || !workspaceRoleRouteEnabled(session.workspace.profile.viewer.role, path)) notFound();
  return session;
}
