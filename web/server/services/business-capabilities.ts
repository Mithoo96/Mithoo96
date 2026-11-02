import 'server-only';
import type {UserServiceContext} from '../context';
import {requirePermission} from '../context';
import {organizationModules,requireModules,clientServiceModules} from '@/core/tenancy/modules';
import {DomainError} from '@/core/errors';
export async function requireClientCapability(ctx:UserServiceContext,clientId:string){
 requirePermission(ctx,'members.read');
 const client=await ctx.db.one<{service_line:string}>('select service_line from public.business_clients where id=$1 and organization_id=$2',[clientId,ctx.organizationId]);
 if(!['SERVICE','TAX','INSURANCE'].includes(client.service_line))throw new DomainError('FORBIDDEN','This client service is unavailable');
 const org=await ctx.db.one<{metadata:Record<string,unknown>}>('select metadata from public.organizations where id=$1',[ctx.organizationId]);
 requireModules(organizationModules(org.metadata),clientServiceModules(client.service_line));
}
