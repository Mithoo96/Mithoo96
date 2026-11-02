import 'server-only';
import type {Workspace} from '@/server/auth/workspace';
import {viewScope} from './workspace-views';
import {hasModules,workspaceRouteEnabled,workspaceRoleRouteEnabled} from '@/core/tenancy/modules';
import {CREATE_PRESET_POLICY,CREATE_TOOLS,type CreateTool} from '@/core/tenancy/content-policy';
import {DomainError} from '@/core/errors';
const presetCopy:Record<string,{name:string;purpose:string}>={
 'product-promotion':{name:'Product Promotion',purpose:'Outline a promotion using verified product details.'},
 'tiktok-shop':{name:'TikTok Shop Campaign',purpose:'Plan content for your shop. Nothing is posted or synced.'},
 'product-launch':{name:'New Product Launch',purpose:'Introduce a product using facts you provide.'},
 'customer-follow-up':{name:'Customer Follow-up',purpose:'Draft a message for review. No customer is contacted.'},
 'abandoned-cart':{name:'Abandoned Cart Follow-up',purpose:'Automated cart follow-up is not available.'},
 'promote-tax':{name:'Promote Tax Service',purpose:'Draft content for your enabled tax service.'},
 'tax-season':{name:'Tax Season Campaign',purpose:'Plan a campaign for your tax practice.'},
 'promote-life':{name:'Promote Life Insurance',purpose:'Draft content for your enabled insurance service.'},
 'life-leads':{name:'Life Insurance Lead Campaign',purpose:'Plan a campaign for review. No lead activity is assumed.'},
 'reactivation':{name:'Client Reactivation Campaign',purpose:'Draft a client message for review. Nothing is sent.'},
};
const toolCopy:Record<CreateTool,{name:string;purpose:string}>={social:{name:'Social Post',purpose:'Draft a post for later review.'},email:{name:'Email',purpose:'Draft an email. No message is sent.'},ad:{name:'Ad',purpose:'Plan your ad copy. No budget is spent.'},campaign:{name:'Campaign',purpose:'Outline a campaign for later review.'}};
export function getCreateWorkspace(workspace:Workspace,tool?:string,preset?:string){
 viewScope(workspace,['CORE'],'dashboard.read');const access=workspace.profile.organization;
 const route=tool?'/create/'+tool:'/create';const path=route+(preset!==undefined?'?preset='+encodeURIComponent(preset):'');
 if(!workspaceRouteEnabled(access,path)||!workspaceRoleRouteEnabled(workspace.profile.viewer.role,path))throw new DomainError('FORBIDDEN','This content option is not available for your workspace');
 const presets=Object.entries(CREATE_PRESET_POLICY).filter(([,policy])=>hasModules(access,policy.modules)).map(([id,policy])=>({id,...presetCopy[id],tool:policy.tool,available:policy.available}));
 return {tools:CREATE_TOOLS.map(id=>({id,...toolCopy[id]})),presets,selection:tool?{tool:tool as CreateTool,name:preset?presetCopy[preset].name:toolCopy[tool as CreateTool].name,purpose:preset?presetCopy[preset].purpose:toolCopy[tool as CreateTool].purpose}:null};
}
