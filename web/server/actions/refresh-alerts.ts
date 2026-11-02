'use server';
import {z} from 'zod';
import {getWorkspace} from '../auth/workspace';
import {memberAction,toActionError} from './result';
import {runAsSystem,requirePermission} from '../context';
import {organizationModules,requireModules} from '@/core/tenancy/modules';
import {DomainError} from '@/core/errors';
import {runRiskScan} from '../services/risk-monitor';
import {logActivity} from '../services/activity';
export async function refreshOperationalAlerts(raw?:unknown){try{
 const orderId=z.string().uuid().optional().parse(raw);
 const {workspace}=await getWorkspace();const org=workspace.profile.organization.id;const uid=workspace.profile.viewer.userId;
 const authorized=await memberAction(org,async ctx=>{requirePermission(ctx,'orders.write');if(!['OWNER','MANAGER'].includes(ctx.role))throw new DomainError('FORBIDDEN','Owner or manager access required');return true;},['CORE','COMMERCE','SHIPPING']);if(!authorized.ok)return authorized;
 // Invoke the existing organization-scoped SYSTEM risk engine; recheck the requesting membership.
 const data=await runAsSystem(org,'risk-scan:authorized-refresh',async ctx=>{
 const current=await ctx.db.maybeOne<{role:string;metadata:Record<string,unknown>}>("select m.role,o.metadata from public.organization_members m join public.organizations o on o.id=m.organization_id where m.organization_id=$1 and m.user_id=$2 and m.status='ACTIVE' and o.status='ACTIVE' for share of m,o",[org,uid]);
 if(!current||!['OWNER','MANAGER'].includes(current.role))throw new DomainError('FORBIDDEN','Active owner or manager membership required');requireModules(organizationModules(current.metadata),['CORE','COMMERCE','SHIPPING']);
 const result=await runRiskScan(ctx,{orderId});await logActivity(ctx,{action:'risk.scan_requested',resourceType:'organization',resourceId:org,summary:'Operational alerts refreshed at an authorized owner/manager request',metadata:{requestedBy:uid}});return result;
 });return {ok:true as const,data};
 }catch(error){return toActionError(error);}}
