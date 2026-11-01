import { getWorkspace } from "@/server/auth/workspace";
import { WorkspaceProvider } from "@/components/shell/workspace";
import { LaunchScreen } from "@/components/launch-screen";
import { OsProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shell/app-shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { workspace } = await getWorkspace();
  return <WorkspaceProvider workspace={workspace}>
    <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("launching")' }} />
    <LaunchScreen />
    <OsProvider><ToastProvider><AppShell>{children}</AppShell></ToastProvider></OsProvider>
  </WorkspaceProvider>;
}
