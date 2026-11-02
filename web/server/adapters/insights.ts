import 'server-only';
import {LIVE_CARRIER_PROOF_SOURCES} from '@/core/shipping/verification';
import {getCommerceAnalytics} from './commerce-analytics';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Workspace} from '../auth/workspace';
import {viewScope} from './workspace-views';
import {hasModules,clientServiceLines,workspaceRoleRouteEnabled} from '@/core/tenancy/modules';
import {getSessionDashboardSummary} from '../services/dashboard';
import {toPrototypeDashboard} from './prototype';
import {DomainError} from '@/core/errors';
async function exact(query:PromiseLike<{count:number|null;error:unknown}>){const r=await query;if(r.error||r.count===null)throw new DomainError('INTEGRATION_ERROR','Recorded insight counts are unavailable');return String(r.count);}
export async function getWorkspaceInsights(client:SupabaseClient,workspace:Workspace){
 const org=viewScope(workspace,['CORE'],'dashboard.read');if(!workspaceRoleRouteEnabled(workspace.profile.viewer.role,'/insights'))throw new DomainError('FORBIDDEN','Insights are unavailable for this role');const access=workspace.profile.organization;
 const metrics:{label:string;value:string}[]=[];
 if(hasModules(access,['COMMERCE'])){
  const summary=await getSessionDashboardSummary(client,workspace);let stats=toPrototypeDashboard(summary,[]).stats;
  if(!hasModules(access,['SHIPPING']))stats=stats.filter(s=>!['Ready to Pack','Awaiting Verification','Shipped Today','Delivered'].includes(s.label));
  metrics.push(...stats.map(s=>({label:s.label,value:String(s.value)})));
  if(hasModules(access,['SHIPPING'])){
   const[accepted,overdue]=await Promise.all([
    exact(client.from('tracking_events').select('id',{head:true,count:'exact'}).eq('organization_id',org).in('source',[...LIVE_CARRIER_PROOF_SOURCES]).eq('normalized_status','ACCEPTED')),
    exact(client.from('orders').select('id',{head:true,count:'exact'}).eq('organization_id',org).lt('ship_by_at',new Date().toISOString()).not('status','in','(SHIPPED,DELIVERED,CANCELLED)')),
   ]);metrics.push({label:'Real Carrier Acceptance Events',value:accepted},{label:'Overdue Shipping Deadlines',value:overdue});
  }
  const analytics=await getCommerceAnalytics(workspace);
  for(const row of analytics.money){const format=(value:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency:row.currency}).format(Number(value));metrics.push({label:`Recorded Order Value (${row.currency})`,value:format(row.total)},{label:`Average Recorded Order Value (${row.currency})`,value:format(row.average)});}
  if(analytics.financialAccess&&!analytics.money.length)metrics.push({label:'Recorded Order Value / Average',value:'Unavailable — no non-demo recorded amounts'});
  metrics.push({label:'Recorded On-time Shipments',value:analytics.timing.on_time},{label:'Recorded Late Shipments',value:analytics.timing.late},{label:'Average Time to Shipment',value:analytics.timing.hours===null?'Unavailable':`${Number(analytics.timing.hours).toFixed(1)} hours`});
 }else{
  const taskCount=(statuses:string[])=>exact(client.from('tasks').select('id',{head:true,count:'exact'}).eq('organization_id',org).eq('type','GENERIC').in('status',statuses));
  const[active,blocked,completed]=await Promise.all([taskCount(['OPEN','IN_PROGRESS','BLOCKED','AWAITING_VERIFICATION']),taskCount(['BLOCKED']),taskCount(['COMPLETED'])]);
  metrics.push({label:'Active Work',value:active},{label:'Blocked Work',value:blocked},{label:'Completed Work',value:completed});
 }
 const lines=clientServiceLines(access);
 for(const line of ['TAX','INSURANCE'] as const)if(lines.includes(line))metrics.push({label:line==='TAX'?'Tax Client Records':'Insurance Client Records',value:await exact(client.from('business_clients').select('id',{head:true,count:'exact'}).eq('organization_id',org).eq('service_line',line))});
 if(hasModules(access,['CORE','CRM','CLIENTS','DOCUMENTS'])){
  const count=(status:string)=>exact(client.from('business_documents').select('id,business_clients!inner(service_line)',{head:true,count:'exact'}).eq('organization_id',org).eq('status',status).in('business_clients.service_line',lines));
  const[requested,uploaded]=await Promise.all([count('REQUESTED'),count('UPLOADED')]);metrics.push({label:'Documents Requested',value:requested},{label:'Documents Uploaded',value:uploaded});
 }
 return {subtitle:hasModules(access,['COMMERCE'])?'Recorded commerce and fulfillment activity':'Recorded workspace activity',metrics,timezone:access.timezone};
}
