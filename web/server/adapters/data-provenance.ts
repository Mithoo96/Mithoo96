import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Workspace} from '../auth/workspace';
import {hasModules} from '@/core/tenancy/modules';
import {viewScope} from './workspace-views';
export async function hasDemonstrationOrders(client:SupabaseClient,workspace:Workspace){
 if(!hasModules(workspace.profile.organization,['COMMERCE']))return false;
 const org=viewScope(workspace,['CORE','COMMERCE']);
 const {data,error}=await client.from('orders').select('id').eq('organization_id',org).or('metadata->>source_is_mock.eq.true,metadata->>test_only.eq.true,order_number.ilike.TEST%').limit(1);
 if(error) return null;
 return Boolean(data?.length);
}
