import {hasModules,type ModuleAccess} from '@/core/tenancy/modules';
import type {IntegrationProvider,IntegrationAction} from './catalog';
export type ConnectionState='Connected'|'Not Connected'|'Needs Attention'|'Coming Soon';
export interface HubConnection{provider:string;status:string;is_mock:boolean;verified_at:string|null;last_sync_at:string|null;expires_at?:string|null}
export interface HubAction{type:IntegrationAction|'coming-soon';label:string;disabled:boolean;href?:string;formAction?:string}
export function providerConnectionState(provider:IntegrationProvider,access:ModuleAccess,connections:readonly HubConnection[]):ConnectionState{
 if(!hasModules(access,provider.requiredCapabilities))return 'Coming Soon';
 const real=connections.filter(c=>!c.is_mock&&!c.provider.endsWith('_MOCK')&&c.provider===provider.id);
 if(real.some(c=>c.status==='ERROR'))return 'Needs Attention';
 const active=real.filter(c=>c.status==='ACTIVE');
 if(active.length){if(provider.id==='TIKTOK_SHOP'&&active.some(c=>!c.expires_at||Date.parse(c.expires_at)<=Date.now()||!Number.isFinite(Date.parse(c.expires_at))))return 'Needs Attention';if(provider.implementation.liveImplemented&&provider.implementation.phase==='ready'&&active.every(c=>!!c.verified_at&&Number.isFinite(Date.parse(c.verified_at))))return 'Connected';return 'Needs Attention';}
 return provider.implementation.connectionInfrastructure?'Not Connected':'Coming Soon';
}
export function providerPrimaryAction(provider:IntegrationProvider,state:ConnectionState,access:ModuleAccess,canManage:boolean):HubAction{
 const details:HubAction={type:'view-details',label:'View Details',disabled:false};
 if(state==='Needs Attention'&&(!provider.implementation.liveImplemented||!canManage))return details;
 if(!hasModules(access,provider.requiredCapabilities)||!provider.implementation.liveImplemented||provider.implementation.phase!=='ready')return {type:'coming-soon',label:'Coming Soon',disabled:true};
 if(!canManage)return details;
 const type:IntegrationAction=state==='Connected'?'manage':state==='Needs Attention'?'reconnect':'connect';
 const href=provider.routes?.[type];
 if(!provider.supportedActions.includes(type)||!href||!href.startsWith('/integrations/')||href.startsWith('//'))return details;
 return {type,label:type==='manage'?'Manage':type==='reconnect'?'Reconnect':'Connect',disabled:false,href};
}
