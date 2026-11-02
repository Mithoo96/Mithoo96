import { getWorkspaceForRoute } from "@/server/auth/modules";
export default async function ModulePage() {
  await getWorkspaceForRoute("/appointments");
  const { default: Page } = await import("@/components/prototype/doc-moise/pages/appointments");
  return <Page />;
}
