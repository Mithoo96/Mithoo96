import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workspace } from '../auth/workspace';
import { DomainError } from '@/core/errors';
import { isOrgRole, resolvePermissions, type Permission } from '@/core/tenancy/permissions';
import { requireModules, type OrganizationModule } from '@/core/tenancy/modules';
export function viewScope(workspace: Workspace, modules: readonly OrganizationModule[], permission?: Permission) {
  const role=workspace.profile.viewer.role;
  if(!isOrgRole(role)||!workspace.profile.organization.id)throw new DomainError('FORBIDDEN','An active organization membership is required');
  requireModules(workspace.profile.organization,modules);
  if(permission&&!resolvePermissions(role,workspace.extraPermissions).has(permission))throw new DomainError('FORBIDDEN','This view is not available for your role');
  return workspace.profile.organization.id;
}
async function rows<T>(query:PromiseLike<{data:unknown;error:unknown}>,schema:z.ZodType<T>){const r=await query;if(r.error)throw new DomainError('INTEGRATION_ERROR','Workspace data is temporarily unavailable');return schema.parse(r.data);}
export const noticeSchema=z.object({id:z.string(),title:z.string(),body:z.string().nullable(),category:z.string(),created_at:z.string(),read_at:z.string().nullable()});
export type WorkspaceNotice=z.infer<typeof noticeSchema>;
export async function getWorkspaceNotices(client:SupabaseClient,workspace:Workspace){const org=viewScope(workspace,['CORE']);return rows(client.from('notifications').select('id,title,body,category,created_at,read_at').eq('organization_id',org).eq('recipient_id',workspace.profile.viewer.userId).order('created_at',{ascending:false}).limit(50),z.array(noticeSchema));}
export async function getWorkspaceProducts(client:SupabaseClient,workspace:Workspace){const org=viewScope(workspace,['CORE','COMMERCE'],'products.read');return rows(client.from('products').select('id,sku,name,status,bin_location').eq('organization_id',org).order('sku').limit(100),z.array(z.object({id:z.string(),sku:z.string(),name:z.string(),status:z.string(),bin_location:z.string().nullable()})));}
export async function getWorkspaceShipping(client:SupabaseClient,workspace:Workspace){const org=viewScope(workspace,['CORE','COMMERCE','SHIPPING'],'shipments.read_all');return rows(client.from('shipments').select('id,order_id,carrier,tracking_number,status,verification_status,ship_by_at,carrier_accepted_at,delivered_at').eq('organization_id',org).order('created_at',{ascending:false}).limit(100),z.array(z.object({id:z.string(),order_id:z.string(),carrier:z.string().nullable(),tracking_number:z.string().nullable(),status:z.string(),verification_status:z.string(),ship_by_at:z.string().nullable(),carrier_accepted_at:z.string().nullable(),delivered_at:z.string().nullable()})));}
export async function getWorkspaceCustomers(client:SupabaseClient,workspace:Workspace){const org=viewScope(workspace,['CORE','COMMERCE'],'customers.read');return rows(client.from('customers').select('id,display_name,channel').eq('organization_id',org).order('created_at',{ascending:false}).limit(100),z.array(z.object({id:z.string(),display_name:z.string(),channel:z.string()})));}
export async function getWorkspaceConnections(client:SupabaseClient,workspace:Workspace){const org=viewScope(workspace,['CORE','COMMERCE','INTEGRATIONS'],'integrations.read');return rows(client.from('integration_connections').select('id,provider,status,is_mock,last_sync_at').eq('organization_id',org).eq('kind','COMMERCE_CHANNEL').order('created_at').limit(100),z.array(z.object({id:z.string(),provider:z.string(),status:z.string(),is_mock:z.boolean(),last_sync_at:z.string().nullable()})));}
