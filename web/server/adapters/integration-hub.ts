import 'server-only';
import {tikTokConfig} from '@/server/integrations/tiktok/config';
import type {SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import type {Workspace} from '../auth/workspace';
import {viewScope} from './workspace-views';
import {hasModules} from '@/core/tenancy/modules';
import {resolvePermissions,type OrgRole} from '@/core/tenancy/permissions';
import {visibleProviders,prioritizedCategories} from '@/integrations/hub/catalog';
import {providerConnectionState,providerPrimaryAction} from '@/integrations/hub/state';
import {providerLogo} from '@/integrations/hub/logos';
import {DomainError} from '@/core/errors';
const connectionSchema=z.object({provider:z.string(),status:z.enum(['ACTIVE','PENDING','ERROR','DISABLED']),is_mock:z.boolean(),verified_at:z.string().nullable(),last_sync_at:z.string().nullable(),expires_at:z.string().nullable().optional()});
export async function getIntegrationHub(client:SupabaseClient,workspace:Workspace){
 const org=viewScope(workspace,['CORE'],'integrations.read');
 const access=workspace.profile.organization;
 const providers=visibleProviders(access).map(p=>p.id==='TIKTOK_SHOP'&&!tikTokConfig()?{...p,implementation:{...p.implementation,liveImplemented:false}}:p);
 const eligible=providers.filter(p=>hasModules(access,p.requiredCapabilities));
 const ids=eligible.flatMap(p=>[p.id,...p.aliases??[]]);
 let connections:z.infer<typeof connectionSchema>[]=[];
 if(ids.length){
  const result=await client.from('integration_connections').select('provider,status,is_mock,last_sync_at,verified_at:metadata->>connection_verified_at,expires_at:metadata->>authorization_expires_at').eq('organization_id',org).in('provider',ids).limit(501);
  if(result.error)throw new DomainError('INTEGRATION_ERROR','Connection status is temporarily unavailable');
  connections=z.array(connectionSchema).parse(result.data);
  if(connections.length>500)throw new DomainError('VALIDATION_FAILED','Connection status requires administrator review');
 }
 const canManage=resolvePermissions(workspace.profile.viewer.role as OrgRole,workspace.extraPermissions).has('integrations.manage');
 return {categories:prioritizedCategories(access),canManage,cards:providers.map(p=>{
  const state=providerConnectionState(p,access,connections);
  return {id:p.id,name:p.name,category:p.category,description:p.description,logo:providerLogo(p.logo),state,
   enabled:hasModules(access,p.requiredCapabilities),missingCapabilities:p.requiredCapabilities.filter(c=>!access.enabledModules.includes(c)),
   implementation:p.implementation.phase,action:providerPrimaryAction(p,state,access,canManage)};
 })};
}
export type IntegrationHubData=Awaited<ReturnType<typeof getIntegrationHub>>;
