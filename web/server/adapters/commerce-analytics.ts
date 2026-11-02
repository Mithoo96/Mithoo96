import 'server-only';
import type {Workspace} from '../auth/workspace';
import {viewScope} from './workspace-views';
import {runAsMember,requirePermission,type ServiceContext} from '../context';

/** Financial totals use recorded values only; demo fixtures never count as revenue. */
export async function getCommerceAnalytics(workspace:Workspace){
 const org=viewScope(workspace,['CORE','COMMERCE'],'dashboard.read');
 return runAsMember(workspace.profile.viewer.userId,org,readCommerceAnalytics);
}
export async function readCommerceAnalytics(ctx:ServiceContext){
 const org=ctx.organizationId;
  requirePermission(ctx,'dashboard.read');
  const money=ctx.permissions.has('revenue.read')?await ctx.db.query<{currency:string;orders:string;total:string;average:string}>(`select currency,count(*)::text as orders,sum(total_amount)::text as total,avg(total_amount)::text as average from public.orders where organization_id=$1 and status <> 'CANCELLED' and total_amount is not null and coalesce(metadata->>'source_is_mock','false') <> 'true' and coalesce(metadata->>'test_only','false') <> 'true' and order_number not ilike 'TEST%' group by currency order by currency`,[org]):[];
  const timing=await ctx.db.one<{shipped:string;on_time:string;late:string;hours:string|null}>(`select count(*) filter(where shipped_at is not null)::text as shipped,count(*) filter(where shipped_at <= ship_by_at)::text as on_time,count(*) filter(where shipped_at > ship_by_at)::text as late,avg(extract(epoch from (shipped_at-placed_at))/3600) filter(where shipped_at >= placed_at)::text as hours from public.orders where organization_id=$1 and status <> 'CANCELLED' and coalesce(metadata->>'source_is_mock','false') <> 'true' and coalesce(metadata->>'test_only','false') <> 'true' and order_number not ilike 'TEST%'`,[org]);
  return {money,timing,financialAccess:ctx.permissions.has('revenue.read')};

}
