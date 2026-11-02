import 'server-only';
import type{SupabaseClient}from'@supabase/supabase-js';import type{Workspace}from'../auth/workspace';import{viewScope}from'./workspace-views';import{z}from'zod';
export async function getOrderManagement(client:SupabaseClient,workspace:Workspace,orderId:string){
 const org=viewScope(workspace,['CORE','COMMERCE'],'orders.write');
 const[details,approvals]=await Promise.all([
 client.from('orders').select('test_only:metadata->>test_only,external_order_id,total_amount,currency,notes,intake_shipping_method:metadata->>intake_shipping_method,intake_tracking:metadata->>intake_tracking,customer_id').eq('organization_id',org).eq('id',orderId).single(),
 client.from('approvals').select('id,action_type,status,requested_by,reason').eq('organization_id',org).eq('order_id',orderId).in('action_type',['MANUAL_SHIP_OVERRIDE','MANUAL_DELIVERY_OVERRIDE']).order('requested_at',{ascending:false}).limit(50)]);
 if(details.error||approvals.error)throw Error('Order management data unavailable');
 const customer=details.data.customer_id?await client.from('customers').select('display_name,email,phone').eq('organization_id',org).eq('id',details.data.customer_id).maybeSingle():{data:null,error:null};if(customer.error)throw Error('Customer context unavailable');
 return{details:z.object({test_only:z.string().nullable(),external_order_id:z.string().nullable(),total_amount:z.union([z.string(),z.number()]).nullable(),currency:z.string().nullable(),notes:z.string().nullable(),intake_shipping_method:z.string().nullable(),intake_tracking:z.string().nullable()}).parse(details.data),customer:customer.data,confirmations:z.array(z.object({id:z.string(),action_type:z.string(),status:z.string(),requested_by:z.string().nullable(),reason:z.string()})).parse(approvals.data)};
}
export type OrderManagement=Awaited<ReturnType<typeof getOrderManagement>>;
