import {getWorkspaceNotices} from "@/server/adapters/workspace-views";
import { getWorkspace } from "@/server/auth/workspace";
import { WorkspaceProvider } from "@/components/shell/workspace";
import { LaunchScreen } from "@/components/launch-screen";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shell/app-shell";
import { hasModules } from "@/core/tenancy/modules";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { client, workspace } = await getWorkspace();
  const notices=workspace.profile.organization.id&&hasModules(workspace.profile.organization,["CORE"])?await getWorkspaceNotices(client,workspace):[];
  return <WorkspaceProvider workspace={workspace}>
    <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("launching")' }} />
    <LaunchScreen />
    <ToastProvider key={workspace.profile.organization.id}><AppShell notices={notices}>{children}</AppShell></ToastProvider>
  </WorkspaceProvider>;
}
