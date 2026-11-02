import {z} from 'zod';
import {cookies} from 'next/headers';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {resolveWorkspace} from '@/server/auth/workspace';
import {orderRenderInspection} from '@/server/adapters/order-render-inspection';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','Vary':'Cookie','Referrer-Policy':'no-referrer'};
/** Temporary read-only session inspection. Uses public Auth and RLS; no admin client or writes. */
export async function GET(request:Request){
 try{
 const id=z.string().uuid().safeParse(new URL(request.url).searchParams.get('orderId'));
 if(!id.success)return Response.json({error:'INVALID_ORDER_ID'},{status:400,headers});
 const client=await createSupabaseServerClient();const workspace=await resolveWorkspace(client,(await cookies()).get('mithoo_workspace')?.value);
 if(!workspace)return Response.json({error:'AUTHENTICATION_REQUIRED'},{status:401,headers});
 if(!workspace.profile.organization.id)return Response.json({error:'ACTIVE_WORKSPACE_REQUIRED'},{status:403,headers});
 const access=orderRenderInspection(workspace,null);
 if(!access.coreEnabled||!access.commerceEnabled)return Response.json(access,{status:403,headers});
 const result=await client.from('orders').select('status').eq('organization_id',workspace.profile.organization.id).eq('id',id.data).maybeSingle();
 if(result.error)return Response.json({error:'ORDER_ACCESS_CHECK_UNAVAILABLE'},{status:503,headers});
 return Response.json(orderRenderInspection(workspace,result.data),{status:result.data?200:404,headers});
 }catch{return Response.json({error:'SESSION_CHECK_UNAVAILABLE'},{status:503,headers});}
}
