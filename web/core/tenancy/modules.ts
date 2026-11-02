import {CREATE_TOOLS,CREATE_PRESET_POLICY} from './content-policy';
import {DomainError} from "@/core/errors";
export const ORGANIZATION_MODULES=["CORE","TEAM","COMMERCE","SHIPPING","SHOPIFY","TIKTOK_SHOP","INTEGRATIONS","CRM","CLIENTS","DOCUMENTS","TAX","INSURANCE","MARKETING","AI"] as const;
export const COMMERCE_CHANNELS=["SHOPIFY","TIKTOK_SHOP"] as const;
export type CommerceChannel=typeof COMMERCE_CHANNELS[number];
export type OrganizationModule=typeof ORGANIZATION_MODULES[number];
export interface ModuleAccess{enabledModules:OrganizationModule[];enabledCommerceChannels:CommerceChannel[];prototypeProfile:"doc-moise"|null}
export function organizationModules(metadata:Record<string,unknown>):ModuleAccess{
 const configured=metadata.enabled_modules;
 const enabledModules:OrganizationModule[]=Array.isArray(configured)?ORGANIZATION_MODULES.filter(k=>configured.includes(k)):["CORE"];
 // Read compatibility for the already configured staging organization.
 const channels=COMMERCE_CHANNELS.filter(k=>enabledModules.includes(k)||Array.isArray(metadata.commerce_channels)&&metadata.commerce_channels.includes(k));
 for(const channel of channels)if(!enabledModules.includes(channel))enabledModules.push(channel);
 return {enabledModules,enabledCommerceChannels:channels,prototypeProfile:null};
}
export function hasModules(access:ModuleAccess,required:readonly OrganizationModule[]){return required.every(k=>access.enabledModules.includes(k));}
export function requireModules(access:ModuleAccess,required:readonly OrganizationModule[]){if(!hasModules(access,required))throw new DomainError("FORBIDDEN","This capability is not enabled for your organization");}
/** Preserved legacy demonstrations are never activated by customer organization metadata. */
export function hasDocMoisePrototype(access:ModuleAccess){void access;return false;}
export const ROUTE_CAPABILITIES:Record<string,readonly OrganizationModule[]>={
 "/":["CORE"],"/settings":["CORE"],"/work":["CORE"],"/inbox":["CORE"],"/activity":["CORE"],"/insights":["CORE"],"/create":["CORE"],
 "/orders":["CORE","COMMERCE"],"/products":["CORE","COMMERCE"],"/customers":["CORE","COMMERCE"],"/shipping":["CORE","COMMERCE","SHIPPING"],"/integrations":["CORE"],"/team":["CORE","TEAM"],
 "/clients":["CORE","CRM","CLIENTS"],"/documents":["CORE","CRM","CLIENTS","DOCUMENTS"],"/tax":["CORE","CRM","CLIENTS","TAX"],"/insurance":["CORE","CRM","CLIENTS","INSURANCE"]};
export function workspaceRouteEnabled(access:ModuleAccess,path:string){
 let url:URL;try{url=new URL(path,'https://workspace.invalid');}catch{return false;}
 if(url.origin!=='https://workspace.invalid')return false;
 const clean=url.pathname;const root='/'+(clean.split('/').filter(Boolean)[0]??'');
 if(root==='/insights'&&clean!=='/insights')return false;
 if(root==='/create'){
  if(!hasModules(access,['CORE']))return false;
  if(clean!=='/create'&&!CREATE_TOOLS.some(tool=>clean==='/create/'+tool))return false;
  if(url.searchParams.getAll('preset').length>1)return false;
  const preset=url.searchParams.get('preset');
  if(preset!==null){if(!Object.hasOwn(CREATE_PRESET_POLICY,preset))return false;const policy=CREATE_PRESET_POLICY[preset];return !!policy&&policy.available&&hasModules(access,policy.modules)&&(clean==='/create'||clean==='/create/'+policy.tool);}
  return true;
 }
 if(clean==='/orders/new')return hasModules(access,['CORE','COMMERCE','SHIPPING']);
 const required=ROUTE_CAPABILITIES[root];return !!required&&hasModules(access,required);
}
export function clientServiceLines(access:ModuleAccess):('SERVICE'|'TAX'|'INSURANCE')[]{if(!hasModules(access,['CORE','CRM','CLIENTS']))return [];return ['SERVICE',...(['TAX','INSURANCE'] as const).filter(line=>hasModules(access,[line]))];}
export function clientServiceModules(line:string):readonly OrganizationModule[]{const required:OrganizationModule[]=['CORE','CRM','CLIENTS'];if(line==='TAX'||line==='INSURANCE')required.push(line);return required;}
export function workspaceRoleRouteEnabled(role:string,path:string){if(role==="OWNER"||role==="MANAGER")return true;if(role!=="EMPLOYEE")return path==="/"||path==="/settings";if(path==="/orders/new")return false;return path==="/"||["/work","/orders","/inbox","/settings","/activity"].some(root=>path===root||path.startsWith(root+"/"));}
