import { getWorkspaceForRoute } from "@/server/auth/modules";
import type PrototypePage from "@/components/prototype/doc-moise/pages/insight-detail";
export default async function ModulePage(props: Parameters<typeof PrototypePage>[0]) {
  await getWorkspaceForRoute("/insights/detail");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/insight-detail");
  return <Page {...props} />;
}
