import {expect,it,vi} from 'vitest';
import {organizationModules,workspaceRouteEnabled,workspaceRoleRouteEnabled,hasDocMoisePrototype} from '@/core/tenancy/modules';
import {commerceConnectionState} from '@/integrations/commerce/catalog';
import {OfficialShopifyProvider} from '@/integrations/shopify/official-provider';
import {OfficialTikTokShopProvider} from '@/integrations/tiktok-shop/official-provider';
import {visibleNav,mainNav,bottomNav} from '@/components/shell/nav';
import {toWorkspaceProfile} from '@/server/adapters/prototype';
import {getSessionOrders} from '@/server/adapters/fulfillment';
import {getWorkspaceConnections,getWorkspaceCustomers,getWorkspaceProducts} from '@/server/adapters/workspace-views';
import type {SupabaseClient} from '@supabase/supabase-js';
const metadata={enabled_modules:['CORE','COMMERCE','SHIPPING','TEAM','INTEGRATIONS'],commerce_channels:['SHOPIFY','TIKTOK_SHOP']};
const org=organizationModules(metadata);
const workspace=(meta:Record<string,unknown>=metadata,role='OWNER')=>({profile:toWorkspaceProfile({id:'org',name:'Any commerce business',slug:'any',timezone:'UTC',metadata:meta},null,'user',role),memberships:[],extraPermissions:[]});
it('fails closed for unknown or unconfigured modules and never inherits sales channels',()=>{
 expect(organizationModules({}).enabledModules).toEqual(['CORE']);
 expect(organizationModules({}).enabledCommerceChannels).toEqual([]);
 expect(organizationModules({enabled_modules:['CORE','unknown'],commerce_channels:['other']}).enabledModules).toEqual(['CORE']);
 for(const route of ['/orders','/products','/shipping','/integrations','/documents'])expect(workspaceRouteEnabled(organizationModules({}),route)).toBe(false);
});
it('shows both commerce channels without enabling tax/insurance prototype routes',()=>{
 expect(org.enabledCommerceChannels).toEqual(['SHOPIFY','TIKTOK_SHOP']);
 expect(visibleNav([...mainNav,...bottomNav],workspace()).map(n=>n.label)).toEqual(['Home','Orders','Products','Work','Shipping','Team','Customers','Inbox','Activity','Insights','Integrations','Settings']);
 for(const route of ['/clients','/clients/one','/documents','/appointments','/approvals','/apps','/create','/insights/revenue'])expect(workspaceRouteEnabled(org,route)).toBe(false);
 for(const route of ['/orders','/products','/work','/shipping','/customers','/inbox','/insights','/integrations','/settings'])expect(workspaceRouteEnabled(org,route)).toBe(true);
});
it('composes Tax and Insurance independently without mounting legacy demonstrations',()=>{
 const tax=organizationModules({enabled_modules:['CORE','CRM','CLIENTS','DOCUMENTS','TAX'],prototype_profile:'doc-moise'});
 expect(hasDocMoisePrototype(tax)).toBe(false);
 expect(workspaceRouteEnabled(tax,'/tax')).toBe(true);
 expect(workspaceRouteEnabled(tax,'/insurance')).toBe(false);
 expect(workspaceRouteEnabled(tax,'/documents')).toBe(true);
 expect(workspaceRouteEnabled(tax,'/integrations')).toBe(false);
});
it('keeps employees out of organization-wide commerce pages',()=>{
 for(const route of ['/integrations','/products','/shipping','/customers','/insights','/orders/new'])expect(workspaceRoleRouteEnabled('EMPLOYEE',route)).toBe(false);
 expect(workspaceRoleRouteEnabled('EMPLOYEE','/work/tasks/assigned')).toBe(true);
 expect(visibleNav(mainNav,workspace(metadata,'EMPLOYEE')).map(n=>n.label)).toEqual(['Home','Work','Inbox','Activity']);
});
it('rejects disabled loaders before any database query',async()=>{
 const from=vi.fn();const client={from} as unknown as SupabaseClient;
 for(const load of [getSessionOrders,getWorkspaceConnections,getWorkspaceCustomers,getWorkspaceProducts])await expect(load(client,workspace({}))).rejects.toMatchObject({code:'FORBIDDEN'});
 expect(from).not.toHaveBeenCalled();
});
it('never presents a mock ACTIVE connection as a live connection',()=>{
 expect(commerceConnectionState('TIKTOK_SHOP',[{provider:'TIKTOK_SHOP_MOCK',status:'ACTIVE',is_mock:true}])).toBe('Not Connected');
 expect(commerceConnectionState('SHOPIFY',[])).toBe('Not Connected');
 expect(commerceConnectionState('SHOPIFY',[{provider:'SHOPIFY',status:'ACTIVE',is_mock:false}])).toBe('Needs Attention');
});
it('official adapters fail closed without HTTP or successful fabricated results',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch');
 for(const p of [new OfficialShopifyProvider(),new OfficialTikTokShopProvider()]){
 expect(p.isMock).toBe(false);
 await expect(p.importOrders()).rejects.toMatchObject({code:'INTEGRATION_NOT_CONFIGURED'});
 expect(p.verifyWebhook().valid).toBe(false);
 }
 expect(fetch).not.toHaveBeenCalled();fetch.mockRestore();
});
