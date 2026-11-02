import { getWorkspaceForRoute } from "@/server/auth/modules";
export default async function ModulePage() {
  await getWorkspaceForRoute("/approvals");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/approvals");
  return <Page />;
}
