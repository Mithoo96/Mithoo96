import { getWorkspaceForRoute } from "@/server/auth/modules";
export default async function ModulePage() {
  await getWorkspaceForRoute("/clients");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/clients");
  return <Page />;
}
