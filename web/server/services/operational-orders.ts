import{z}from'zod';import{DomainError}from'@/core/errors';import{requirePermission,type UserServiceContext}from'../context';
import{transitionOrder}from'./orders';import{prepareShipment}from'./shipping';import{verifyTask}from'./tasks';import{requestApproval,approveAction,rejectAction}from'./approvals';import{createException}from'./exceptions';import{assertTrackingAvailable}from'./manual-orders';
export const operationalActionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('verifyOrder'),orderId:z.string().uuid()}).strict(),
 z.object({action:z.literal('prepareLabel'),orderId:z.string().uuid(),carrier:z.string().regex(/^[A-Z0-9_]+$/).max(32),tracking:z.string().trim().min(5).max(64),shippingMethod:z.string().max(64).optional(),assigneeId:z.string().uuid().optional(),labelConfirmed:z.literal(true)}).strict(),
 z.object({action:z.literal('verifyTask'),orderId:z.string().uuid(),taskId:z.string().uuid(),approve:z.boolean(),reason:z.string().trim().min(3).max(1000)}).strict(),
 z.object({action:z.literal('requestConfirmation'),orderId:z.string().uuid(),kind:z.enum(['SHIPPED','DELIVERED']),reason:z.string().trim().min(10).max(1000),confirmed:z.literal(true)}).strict(),
 z.object({action:z.literal('decideConfirmation'),orderId:z.string().uuid(),approvalId:z.string().uuid(),approve:z.boolean(),reason:z.string().trim().min(3).max(1000)}).strict(),
 z.object({action:z.literal('flagIssue'),orderId:z.string().uuid(),type:z.enum(['REFUND_RISK','CUSTOMER_RESPONSE_REQUIRED','PLATFORM_ACTION_REQUIRED']),reason:z.string().trim().min(5).max(1000)}).strict(),
]);
export async function operateOrder(ctx:UserServiceContext,raw:unknown){
 requirePermission(ctx,'orders.write');if(!['OWNER','MANAGER'].includes(ctx.role))throw new DomainError('FORBIDDEN','Owner or manager access required');const input=operationalActionSchema.parse(raw);
 const order=await ctx.db.one<{id:string;status:string}>('select id,status from public.orders where id=$1 and organization_id=$2 for update',[input.orderId,ctx.organizationId]);
 switch(input.action){
 case'verifyOrder':return transitionOrder(ctx,{orderId:order.id,to:'VERIFIED',reason:'Order details and shipping address reviewed by an authorized member'});
 case'prepareLabel':if(order.status!=='VERIFIED')throw new DomainError('GUARD_FAILED','Verify the order before preparing its label');await assertTrackingAvailable(ctx,input.tracking,order.id);return prepareShipment(ctx,{orderId:order.id,carrier:input.carrier,trackingNumber:input.tracking,serviceLevel:input.shippingMethod,label:{source:'MANUAL',barcodeValue:input.tracking},assignTo:input.assigneeId});
 case'verifyTask':await ctx.db.one('select id from public.tasks where id=$1 and order_id=$2 and organization_id=$3',[input.taskId,order.id,ctx.organizationId]);await verifyTask(ctx,{taskId:input.taskId,approve:input.approve,comment:input.reason});return{message:'Package review recorded'};
 case'requestConfirmation':{
  const expected=input.kind==='SHIPPED'?'READY_TO_SHIP':'SHIPPED';if(order.status!==expected)throw new DomainError('GUARD_FAILED','The order is not eligible for this confirmation');
  const type=input.kind==='SHIPPED'?'MANUAL_SHIP_OVERRIDE':'MANUAL_DELIVERY_OVERRIDE';
  const existing=await ctx.db.maybeOne<{id:string}>("select id from public.approvals where organization_id=$1 and order_id=$2 and action_type=$3 and status='PENDING'",[ctx.organizationId,order.id,type]);if(existing)return{approvalId:existing.id};
  return requestApproval(ctx,{actionType:type,resourceId:order.id,orderId:order.id,reason:input.reason,payload:{manualConfirmation:true,carrierConfirmed:false}});
 }
 case'decideConfirmation':{
  await ctx.db.one("select id from public.approvals where id=$1 and organization_id=$2 and order_id=$3 and action_type in ('MANUAL_SHIP_OVERRIDE','MANUAL_DELIVERY_OVERRIDE')",[input.approvalId,ctx.organizationId,order.id]);
  return input.approve?approveAction(ctx,{approvalId:input.approvalId,comment:input.reason}):rejectAction(ctx,{approvalId:input.approvalId,comment:input.reason});
 }
 case'flagIssue':return createException(ctx,{type:input.type,orderId:order.id,description:`Manually reported operational issue (${ctx.role}): ${input.reason}`});
 }
}
