import{beforeAll,afterAll,it,expect}from'vitest';import{runAsMember}from'@/server/context';import{readCommerceAnalytics}from'@/server/adapters/commerce-analytics';import{createManualOrder}from'@/server/services/manual-orders';import{closeDatabase,describeDb,freshDatabase,ids}from'../helpers/db';
describeDb('recorded commerce analytics',()=>{beforeAll(freshDatabase);afterAll(closeDatabase);
 it('excludes seeded demo money and reports missing history without invented averages',async()=>{const r=await runAsMember(ids.owner,ids.org,readCommerceAnalytics);expect(r.money).toEqual([]);expect(r.timing).toEqual({shipped:'0',on_time:'0',late:'0',hours:null});});
 it('aggregates only known non-demo amounts by currency and preserves role restrictions',async()=>{
 const base={requestId:crypto.randomUUID(),orderNumber:'RECORDED-ANALYTICS',customerName:'Fictional local test',address:'1 Local Street',city:'Local City',postalCode:'00000',country:'US',items:[{sku:'LOCAL-ANALYTICS',name:'Local test',quantity:1}],total:'42.50',currency:'USD'};
 await runAsMember(ids.owner,ids.org,ctx=>createManualOrder(ctx,base));await runAsMember(ids.owner,ids.org,ctx=>createManualOrder(ctx,{...base,requestId:crypto.randomUUID(),orderNumber:'TEST-EXCLUDED',total:'999.00',testOnly:true}));
 const r=await runAsMember(ids.owner,ids.org,readCommerceAnalytics);expect(r.money).toHaveLength(1);expect(r.money[0]).toMatchObject({currency:'USD',orders:'1',total:'42.50'});expect(Number(r.money[0].average)).toBe(42.5);
 const manager=await runAsMember(ids.manager,ids.org,readCommerceAnalytics);expect(manager.money).toEqual([]);expect(manager.financialAccess).toBe(false);
 await expect(runAsMember(ids.emp1,ids.org,readCommerceAnalytics)).rejects.toMatchObject({code:'FORBIDDEN'});
 });
});
