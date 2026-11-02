import {getWorkspaceNotices} from "@/server/adapters/workspace-views";
import { getWorkspace } from "@/server/auth/workspace";
import { WorkspaceProvider } from "@/components/shell/workspace";
import { LaunchScreen } from "@/components/launch-screen";
import { OsProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shell/app-shell";
import { hasDocMoisePrototype,hasModules } from "@/core/tenancy/modules";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { client, workspace } = await getWorkspace();
  const notices=workspace.profile.organization.id&&hasModules(workspace.profile.organization,["CORE"])?await getWorkspaceNotices(client,workspace):[];
  const legacy = hasDocMoisePrototype(workspace.profile.organization);
  const Store = legacy ? (await import("@/components/prototype/doc-moise/provider")).DocMoiseProvider : OsProvider;
  return <WorkspaceProvider workspace={workspace}>
    <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("launching")' }} />
    <LaunchScreen />
    <Store key={workspace.profile.organization.id} viewerName={workspace.profile.viewer.name ?? "Workspace member"}><ToastProvider><AppShell notices={notices}>{children}</AppShell></ToastProvider></Store>
  </WorkspaceProvider>;
}
