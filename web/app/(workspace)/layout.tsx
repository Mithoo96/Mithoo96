import {hasDemonstrationOrders} from '@/server/adapters/data-provenance';
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
  const demo=await hasDemonstrationOrders(client,workspace);
  return <WorkspaceProvider workspace={workspace}>
    <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("launching")' }} />
    <LaunchScreen />
    <ToastProvider key={workspace.profile.organization.id}><AppShell notices={notices}>{demo!==false&&<aside className="mx-5 mt-4 rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-900">{demo===null?'Order provenance could not be checked. Counts may include demo/test records.':'This workspace includes fictional demo/test orders.'} Operational counts include those records; revenue insights exclude identified demo/test orders. These records do not represent live provider activity.</aside>}{children}</AppShell></ToastProvider>
  </WorkspaceProvider>;
}
