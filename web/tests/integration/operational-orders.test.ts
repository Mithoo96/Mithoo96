import{beforeAll,afterAll,it,expect}from'vitest';import{runAsMember}from'@/server/context';import{createManualOrder}from'@/server/services/manual-orders';import{operateOrder}from'@/server/services/operational-orders';import{closeDatabase,describeDb,freshDatabase,ids}from'../helpers/db';
describeDb('owner and manager operational controls',()=>{beforeAll(freshDatabase);afterAll(closeDatabase);
 it('verifies intake then prepares an assigned task through existing guards, without carrier proof',async()=>{
 const order=await runAsMember(ids.owner,ids.org,ctx=>createManualOrder(ctx,{requestId:crypto.randomUUID(),orderNumber:'TEST-ONLY-OPERATIONS',customerName:'TEST ONLY Customer',address:'1 Fictional Road',city:'Test City',postalCode:'00000',country:'US',items:[{sku:'TEST-OPS',name:'Test product',quantity:1}],testOnly:true}));
 await expect(runAsMember(ids.emp1,ids.org,ctx=>operateOrder(ctx,{action:'verifyOrder',orderId:order.id}))).rejects.toMatchObject({code:'FORBIDDEN'});
 await expect(runAsMember(ids.manager,ids.org,ctx=>operateOrder(ctx,{action:'prepareLabel',orderId:order.id,carrier:'USPS',tracking:'9400000000000000017744',labelConfirmed:true,assigneeId:ids.emp2}))).rejects.toMatchObject({code:'GUARD_FAILED'});
 await runAsMember(ids.manager,ids.org,ctx=>operateOrder(ctx,{action:'verifyOrder',orderId:order.id}));
 await runAsMember(ids.manager,ids.org,ctx=>operateOrder(ctx,{action:'prepareLabel',orderId:order.id,carrier:'USPS',tracking:'9400000000000000017744',labelConfirmed:true,assigneeId:ids.emp2}));
 const state=await runAsMember(ids.owner,ids.org,ctx=>ctx.db.one('select o.status,s.carrier_accepted_at,t.assigned_to,t.status as task_status from public.orders o join public.shipments s on s.order_id=o.id join public.tasks t on t.order_id=o.id where o.id=$1',[order.id]));expect(state).toMatchObject({status:'READY_TO_PACK',carrier_accepted_at:null,assigned_to:ids.emp2,task_status:'OPEN'});
 await expect(runAsMember(ids.owner,ids.org,ctx=>operateOrder(ctx,{action:'requestConfirmation',orderId:order.id,kind:'SHIPPED',reason:'No physical handoff took place',confirmed:true}))).rejects.toMatchObject({code:'GUARD_FAILED'});
 });
 it('cannot review another organization task or authorize another organization order',async()=>{
 await expect(runAsMember(ids.owner,ids.org,ctx=>operateOrder(ctx,{action:'verifyOrder',orderId:ids.order(99)}))).rejects.toMatchObject({code:'NOT_FOUND'});
 });
});
