import{beforeAll,afterAll,it,expect}from'vitest';import{runAsMember,runAsSystem}from'@/server/context';import{createManualOrder}from'@/server/services/manual-orders';import{runRiskScan}from'@/server/services/risk-monitor';import{closeDatabase,describeDb,freshDatabase,ids}from'../helpers/db';
describeDb('scoped operational risk refresh',()=>{beforeAll(freshDatabase);afterAll(closeDatabase);
 it('evaluates the selected intake without touching another order or inventing carrier observations',async()=>{
 const order=await runAsMember(ids.owner,ids.org,ctx=>createManualOrder(ctx,{requestId:crypto.randomUUID(),orderNumber:'TEST-SCOPED-RISK',customerName:'Fictional local test',address:'1 Test Street',city:'Test City',postalCode:'00000',country:'US',items:[{sku:'TEST-RISK',name:'Fictional item',quantity:1}],testOnly:true,shipByAt:new Date(Date.now()+3600000).toISOString()}));
 const snapshot=()=>runAsMember(ids.owner,ids.org,async ctx=>({tasks:await ctx.db.query('select id,status,priority from public.tasks order by id'),exceptions:await ctx.db.query('select id,status,occurrences from public.exceptions where order_id is distinct from $1 order by id',[order.id])}));const before=await snapshot();
 const result=await runAsSystem(ids.org,'test:scoped-risk',ctx=>runRiskScan(ctx,{orderId:order.id}));expect(result.ordersScanned).toBe(1);expect(await snapshot()).toEqual(before);
 const exceptions=await runAsMember(ids.owner,ids.org,ctx=>ctx.db.query<{type:string}>('select type from public.exceptions where order_id=$1',[order.id]));expect(exceptions.map(x=>x.type)).toContain('SHIPMENT_DEADLINE_APPROACHING');expect(exceptions.map(x=>x.type)).not.toContain('CARRIER_NOT_RECEIVED');
 });
});
