import { getWorkspaceForRoute } from "@/server/auth/modules";
export default async function ModulePage() {
  await getWorkspaceForRoute("/documents");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/documents");
  return <Page />;
}
