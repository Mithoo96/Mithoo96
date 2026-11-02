import {afterAll,beforeAll,expect,it} from 'vitest';
import {runAsSystem} from '@/server/context';
import {upsertImportedOrder} from '@/server/services/integrations';
import type {ImportedOrder} from '@/integrations/types';
import {closeDatabase,describeDb,freshDatabase,ids} from '../helpers/db';
describeDb('provider-neutral normalized orders',()=>{
 beforeAll(freshDatabase);afterAll(closeDatabase);
 it('keeps identical provider order references separate, source-preserving and idempotent',async()=>{
  await runAsSystem(ids.org,'test:normalization',async ctx=>{
   const order:ImportedOrder={externalOrderId:'TEST-SAME-EXTERNAL-REFERENCE',placedAt:new Date(),shipByAt:null,platformStatus:'ON_HOLD',currency:null,amounts:null,customer:{externalRef:'TEST-CUSTOMER',displayName:'Fictional normalized customer'},shippingAddress:null,items:[],shipping:null,platformFlags:{}};
   const results=[];
   for(const channel of ['SHOPIFY','TIKTOK_SHOP']){
    const conn=await ctx.db.one<Parameters<typeof upsertImportedOrder>[1]>("insert into public.integration_connections (organization_id,provider,kind,display_name,status,is_mock) values ($1,$2,'COMMERCE_CHANNEL',$3,'ACTIVE',true) returning *",[ids.org,channel,`TEST ONLY ${channel}`]);
    const first=await upsertImportedOrder(ctx,conn,{...order,orderNumber:`TEST-${channel}`},channel);
    const second=await upsertImportedOrder(ctx,conn,{...order,orderNumber:`TEST-${channel}`},channel);
    expect(first.created).toBe(true);expect(second.created).toBe(false);expect(second.orderId).toBe(first.orderId);results.push(first.orderId);
    expect(await ctx.db.one('select channel,external_order_id,status from public.orders where id=$1',[first.orderId])).toEqual({channel,external_order_id:order.externalOrderId,status:'NEW'});
    expect(await ctx.db.one('select count(*)::int n from public.activity_logs where order_id=$1 and action=$2',[first.orderId,'integration.order_imported'])).toEqual({n:1});
   }
   expect(results[0]).not.toBe(results[1]);
  });
 });
});
