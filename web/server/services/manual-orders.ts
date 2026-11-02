import {z} from 'zod';
import {requirePermission,type ServiceContext} from '../context';
import {prepareShipment} from './shipping';import {logActivity} from './activity';
import {DomainError} from '@/core/errors';import {normalizeTracking} from '@/core/shipping/tracking';
const optionalText=(max:number)=>z.string().trim().min(1).max(max).optional();
const money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/,'Enter a nonnegative amount with at most two decimal places').optional();
export const manualOrderSchema=z.object({
 requestId:z.string().uuid(),channel:z.enum(['TIKTOK_SHOP','SHOPIFY','WEBSITE','MANUAL','OTHER']).default('MANUAL'),
 orderNumber:z.string().trim().min(1).max(64),externalOrderNumber:optionalText(100),
 customerName:z.string().trim().min(2).max(200),customerEmail:z.string().email().max(254).optional(),customerPhone:optionalText(40),
 address:z.string().trim().min(2).max(200),city:z.string().trim().min(2).max(100),postalCode:z.string().trim().min(2).max(30),country:z.string().regex(/^[A-Z]{2}$/),
 items:z.array(z.object({sku:z.string().trim().min(1).max(100),name:z.string().trim().min(1).max(200),quantity:z.number().int().min(1).max(10000)}).strict()).min(1).max(50),
 total:money,currency:z.string().regex(/^[A-Z]{3}$/).default('USD'),shippingMethod:optionalText(64),shipByAt:z.string().datetime().optional(),notes:z.string().trim().max(2000).optional(),
 carrier:z.string().regex(/^[A-Z0-9_]+$/).max(32).optional(),tracking:z.string().trim().min(5).max(64).optional(),labelConfirmed:z.boolean().default(false),assigneeId:z.string().uuid().optional(),testOnly:z.boolean().default(false),
}).strict().superRefine((v,ctx)=>{if(v.labelConfirmed&&(!v.carrier||!v.tracking))ctx.addIssue({code:'custom',message:'An actual label requires carrier and full tracking',path:['tracking']});});
export async function assertTrackingAvailable(ctx:ServiceContext,tracking:string,orderId?:string){
 const normalized=normalizeTracking(tracking);if(!normalized||normalized.length<5)throw new DomainError('VALIDATION_FAILED','Enter the complete tracking number');
 await ctx.db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`tracking:${ctx.organizationId}:${normalized}`]);
 const duplicate=await ctx.db.maybeOne("select 1 from public.shipments s join public.orders o on o.id=s.order_id where s.organization_id=$1 and s.tracking_number_normalized=$2 and s.status<>'CANCELLED' and o.status<>'CANCELLED' and ($3::uuid is null or s.order_id<>$3) limit 1",[ctx.organizationId,normalized,orderId??null]);
 if(duplicate)throw new DomainError('CONFLICT','Tracking already belongs to another active order. No order or shipping state was advanced.',{validation:'DUPLICATE_TRACKING'});
}
export async function createManualOrder(ctx:ServiceContext,raw:unknown){
 requirePermission(ctx,'orders.write');const input=manualOrderSchema.parse(raw);
 await ctx.db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`manual:${ctx.organizationId}:${input.requestId}`]);
 const previous=await ctx.db.maybeOne<{id:string}>("select id from public.orders where organization_id=$1 and (metadata->>'manual_entry_request_id'=$2 or (channel='MANUAL' and external_order_id=$2))",[ctx.organizationId,input.requestId]);if(previous)return previous;
 if(input.tracking)await assertTrackingAvailable(ctx,input.tracking);
 if(input.labelConfirmed)requirePermission(ctx,'shipments.write');
 const customer=await ctx.db.one<{id:string}>("insert into public.customers(organization_id,channel,display_name,email,phone) values ($1,$2,$3,$4,$5) returning id",[ctx.organizationId,input.channel,input.customerName,input.customerEmail??null,input.customerPhone??null]);
 const address=await ctx.db.one<{id:string}>("insert into public.customer_addresses(organization_id,customer_id,kind,recipient_name,line1,city,postal_code,country) values ($1,$2,'SHIPPING',$3,$4,$5,$6,$7) returning id",[ctx.organizationId,customer.id,input.customerName,input.address,input.city,input.postalCode,input.country]);
 const metadata={manual_entry:true,manual_entry_request_id:input.requestId,test_only:input.testOnly,intake_shipping_method:input.shippingMethod??null,intake_tracking:input.tracking??null};
 const order=await ctx.db.one<{id:string}>("insert into public.orders(organization_id,order_number,channel,external_order_id,customer_id,shipping_address_id,total_amount,currency,ship_by_at,notes,metadata,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id",[ctx.organizationId,input.orderNumber,input.channel,input.externalOrderNumber??input.orderNumber,customer.id,address.id,input.total??null,input.total!==undefined?input.currency:null,input.shipByAt??null,input.notes??null,JSON.stringify(metadata),ctx.actor.kind==='USER'?ctx.actor.userId:null]);
 for(const item of input.items){const product=await ctx.db.one<{id:string}>("insert into public.products(organization_id,sku,name) values ($1,$2,$3) on conflict(organization_id,sku) do update set name=products.name returning id",[ctx.organizationId,item.sku,item.name]);await ctx.db.query("insert into public.order_items(organization_id,order_id,product_id,sku,name,quantity) values ($1,$2,$3,$4,$5,$6)",[ctx.organizationId,order.id,product.id,item.sku,item.name,item.quantity]);}
 if(input.labelConfirmed)await prepareShipment(ctx,{orderId:order.id,carrier:input.carrier!,serviceLevel:input.shippingMethod,trackingNumber:input.tracking!,shipByAt:input.shipByAt,label:{source:'MANUAL',barcodeValue:input.tracking!},assignTo:input.assigneeId});
 await logActivity(ctx,{action:'order.created',resourceType:'order',resourceId:order.id,orderId:order.id,summary:`${input.testOnly?'TEST ONLY: ':''}Manually recorded ${input.channel} order. No store synchronization, carrier acceptance or delivery is implied.`});return order;
}
