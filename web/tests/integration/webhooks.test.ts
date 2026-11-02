import { afterAll, beforeAll, expect, it } from "vitest";
import { runAsSystem } from "@/server/context";
import { importOrdersFromConnection, receiveWebhook } from "@/server/services/integrations";
import { hmacSha256Hex } from "@/integrations/webhooks/signature";
import { closeDatabase, describeDb, freshDatabase, ids } from "../helpers/db";

const SECRET = "test-only-webhook-secret";

function signed(body: object, secret = SECRET) {
  const rawBody = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  return { rawBody, headers: { "x-mock-timestamp": ts, "x-mock-signature": hmacSha256Hex(secret, `${ts}.${rawBody}`) } };
}

describeDb("webhooks & integrations (MOCK TikTok Shop)", () => {
  beforeAll(async () => {
    process.env.INTEGRATION_SECRET_ZILE_TIKTOK_MOCK = SECRET;
    await freshDatabase();
  });
  afterAll(closeDatabase);

  const event = { event_id: "evt-100", type: "ORDER_CREATED", order_id: "MOCK-TTS-9001", occurred_at: new Date().toISOString(), data: {} };

  it("rejects bad signatures without side effects", async () => {
    const r = await receiveWebhook("TIKTOK_SHOP_MOCK", ids.conn, signed(event, "wrong-secret"));
    expect(r.httpStatus).toBe(401);
    const orders = await runAsSystem(ids.org, "t", (ctx) => ctx.db.one<{ n: number }>(`select count(*)::int as n from public.orders where external_order_id = 'MOCK-TTS-9001'`));
    expect(orders.n).toBe(0);
  });

  it("processes once and treats redeliveries as duplicates", async () => {
    const req = signed(event);
    const first = await receiveWebhook("TIKTOK_SHOP_MOCK", ids.conn, req);
    expect(first).toMatchObject({ httpStatus: 200, status: "PROCESSED" });
    const again = await receiveWebhook("TIKTOK_SHOP_MOCK", ids.conn, signed(event));
    expect(again).toMatchObject({ httpStatus: 200, status: "DUPLICATE" });
    const row = await runAsSystem(ids.org, "t", (ctx) =>
      ctx.db.one<{ n: number; status: string }>(`select count(*)::int as n, max(o.status) as status from public.orders o where external_order_id = 'MOCK-TTS-9001'`),
    );
    expect(row.n).toBe(1);
    expect(row.status).toBe("READY_TO_PACK"); // imported → verified → label → pack task
  });

  it("concurrent duplicate deliveries create one order", async () => {
    const e = { ...event, event_id: "evt-200", order_id: "MOCK-TTS-9002" };
    const results = await Promise.all([receiveWebhook("TIKTOK_SHOP_MOCK", ids.conn, signed(e)), receiveWebhook("TIKTOK_SHOP_MOCK", ids.conn, signed(e))]);
    expect(results.filter((r) => r.status === "PROCESSED")).toHaveLength(1);
    const n = await runAsSystem(ids.org, "t", (ctx) => ctx.db.one<{ n: number }>(`select count(*)::int as n from public.orders where external_order_id = 'MOCK-TTS-9002'`));
    expect(n.n).toBe(1);
  });

  it("unknown connections and providers are rejected", async () => {
    expect((await receiveWebhook("TIKTOK_SHOP_MOCK", "00000000-0000-4000-8000-000000000000", signed(event))).httpStatus).toBe(404);
    expect((await receiveWebhook("TIKTOK_SHOP", ids.conn, signed(event))).httpStatus).toBe(404);
  });

  it("order import is idempotent", async () => {
    const a = await importOrdersFromConnection(ids.org, ids.conn);
    const b = await importOrdersFromConnection(ids.org, ids.conn);
    expect(a.imported).toBe(3);
    expect(b.created).toBe(0);
  });
  it("rejects disabled organization channels before importing or recording webhook attempts",async()=>{
    const before=await runAsSystem(ids.org,"test:entitlements",async ctx=>{
      const metadata=await ctx.db.one<{metadata:Record<string,unknown>}>("select metadata from public.organizations where id=$1",[ids.org]);
      const counts=await ctx.db.one<{orders:number;events:number}>("select (select count(*)::int from public.orders) orders,(select count(*)::int from public.integration_events) events");
      await ctx.db.query("update public.organizations set metadata=jsonb_set(metadata,'{commerce_channels}','[]'::jsonb) where id=$1",[ids.org]);
      return {metadata:metadata.metadata,counts};
    });
    try {
      await expect(importOrdersFromConnection(ids.org,ids.conn)).rejects.toMatchObject({code:"FORBIDDEN"});
      expect(await receiveWebhook("TIKTOK_SHOP_MOCK",ids.conn,signed({...event,event_id:"disabled-channel-event"}))).toMatchObject({httpStatus:403,status:"REJECTED"});
      const after=await runAsSystem(ids.org,"test:counts",ctx=>ctx.db.one<{orders:number;events:number}>("select (select count(*)::int from public.orders) orders,(select count(*)::int from public.integration_events) events"));
      expect(after).toEqual(before.counts);
    } finally { await runAsSystem(ids.org,"test:restore",ctx=>ctx.db.query("update public.organizations set metadata=$2 where id=$1",[ids.org,JSON.stringify(before.metadata)])); }
  });

});
