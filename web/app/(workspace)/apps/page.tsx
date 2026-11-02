import { getWorkspaceForRoute } from "@/server/auth/modules";
export default async function ModulePage() {
  await getWorkspaceForRoute("/apps");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/apps");
  return <Page />;
}
