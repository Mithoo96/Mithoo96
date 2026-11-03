import { afterAll, beforeAll, expect, it } from "vitest";
import { runAsMember } from "@/server/context";
import { getWorkspaceProfile, toExceptionCard, toPrototypeDashboard } from "@/server/adapters/prototype";
import { getDashboardSummary } from "@/server/services/dashboard";
import { getExceptions } from "@/server/services/exceptions";
import { closeDatabase, describeDb, freshDatabase, ids } from "../helpers/db";

describeDb("prototype UI adapters", () => {
  beforeAll(freshDatabase);
  afterAll(closeDatabase);

  it("greets the authenticated viewer by first name, under the Mithoo product brand", async () => {
    const p = await runAsMember(ids.owner, ids.org, (ctx) => getWorkspaceProfile(ctx));
    expect(p.product).toBe("Mithoo Business OS");
    expect(p.organization.name).toBe("Operations Test Tenant");
    expect(p.organization.monogram).toBe("OT");
    expect(p.viewer.firstName).toBe("Test");
    const m = await runAsMember(ids.manager, ids.org, (ctx) => getWorkspaceProfile(ctx));
    expect(m.viewer.firstName).toBe("Morgan");
  });

  it("produces the prototype dashboard shape from real data", async () => {
    const d = await runAsMember(ids.owner, ids.org, async (ctx) => toPrototypeDashboard(await getDashboardSummary(ctx), await getExceptions(ctx, { limit: 6 })));
    expect(d.stats.map((s) => s.label)).toContain("Ready to Pack");
    expect(d.attention.length).toBeGreaterThan(0);
    expect(d.attention[0]!.tone).toBe("rose");
    const cards = await runAsMember(ids.manager, ids.org, async (ctx) => (await getExceptions(ctx)).map((e) => toExceptionCard(e, true)));
    expect(cards.some((c) => c.headline === "ORDER AT RISK" && c.timeRemaining)).toBe(true);
  });
});
