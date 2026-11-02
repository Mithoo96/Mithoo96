import { getWorkspaceForRoute } from "@/server/auth/modules";
import type PrototypePage from "@/components/prototype/doc-moise/pages/client-detail";
export default async function ModulePage(props: Parameters<typeof PrototypePage>[0]) {
  await getWorkspaceForRoute("/clients");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/client-detail");
  return <Page {...props} />;
}
