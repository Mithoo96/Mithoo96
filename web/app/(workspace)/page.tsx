import { redirect } from "next/navigation";
import { Hero } from "@/components/hero";
import { TodayCard, AiActivity, QuickActions, Approvals, NeedsAttention } from "@/components/sections";
import { Page } from "@/components/ui/primitives";

import { getWorkspace } from "@/server/auth/workspace";
import { getSessionDashboardSummary } from "@/server/services/dashboard";
import { toPrototypeDashboard } from "@/server/adapters/prototype";
import { isOrgRole, resolvePermissions } from "@/core/tenancy/permissions";
import { getSessionWorkspaceActivity } from "@/server/adapters/fulfillment";

export default async function Home() {
  const { client, workspace } = await getWorkspace();
  const role = workspace.profile.viewer.role;
  if (role === "EMPLOYEE") redirect("/work");
  if (!isOrgRole(role) || !resolvePermissions(role, workspace.extraPermissions).has("dashboard.read")) {
    return <Page><Hero /><p className="glass rounded-[28px] p-8">{role === "EMPLOYEE" ? "Your employee workspace is active. Guided task integration is coming next; owner dashboard access is restricted." : "No active organization workspace is available. Contact your organization administrator."}</p></Page>;
  }
  let summary; let activity;
  try { [summary, activity] = await Promise.all([
    getSessionDashboardSummary(client, workspace),
    getSessionWorkspaceActivity(client, workspace).catch(() => null),
  ]); }
  catch { return <Page><Hero /><p role="alert" className="glass rounded-[28px] p-8">Dashboard data could not be loaded. Refresh to try again. No sample values are shown.</p></Page>; }
  const data = toPrototypeDashboard(summary, []);
  data.attention.unshift(...[
    { title: `${summary.orders.needAttention} orders need attention`, detail: "Open order exceptions", href: "/orders?filter=attention", tone: "rose" as const },
    { title: `${summary.orders.atRisk} orders at risk`, detail: "High or critical risk and at-risk exceptions", href: "/orders?filter=at-risk", tone: "amber" as const },
  ].filter((_, index) => index === 0 ? summary.orders.needAttention > 0 : summary.orders.atRisk > 0));
  return (
    <Page>
      <Hero />
      <div className="rise -mt-4 mb-8" style={{ animationDelay: "280ms" }}><p className="text-[14px] text-mute">{workspace.profile.organization.name} · {role}</p></div>
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <TodayCard data={data} />
        <AiActivity data={data} activity={activity} timezone={workspace.profile.organization.timezone} />
      </div>
      {summary.revenueAtRisk && <div className="glass mt-5 rounded-[28px] p-8"><h2 className="text-[20px] font-semibold">Potential Revenue At Risk</h2>{summary.revenueAtRisk.map((r) => <p key={r.currency} className="mt-3 text-[24px]">{r.currency} {r.amount}</p>)}{!!summary.revenueAtRiskOrdersWithoutAmount && <p className="mt-2 text-[13px] text-mute">{summary.revenueAtRiskOrdersWithoutAmount} orders without amounts excluded.</p>}</div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <NeedsAttention data={data} />
        <Approvals summary={summary} />
      </div>
      <div className="mt-5"><QuickActions live /></div>
    </Page>
  );
}
