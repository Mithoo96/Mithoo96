import { getWorkspaceForRoute } from "@/server/auth/modules";
import type PrototypePage from "@/components/prototype/doc-moise/pages/create-tool";
export default async function ModulePage(props: Parameters<typeof PrototypePage>[0]) {
  await getWorkspaceForRoute("/create");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/create-tool");
  return <Page {...props} />;
}
