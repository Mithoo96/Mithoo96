import { getWorkspaceForRoute } from "@/server/auth/modules";
export default async function ModulePage() {
  await getWorkspaceForRoute("/create");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/create");
  return <Page />;
}
