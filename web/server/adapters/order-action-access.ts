import 'server-only';
import {workspaceRouteEnabled,workspaceRoleRouteEnabled} from '@/core/tenancy/modules';
import type {Workspace} from '../auth/workspace';
import {isOrgRole,resolvePermissions} from '@/core/tenancy/permissions';

/** Same policy is used by the page and the temporary read-only session inspection. */
export function orderActionAccess(workspace:Workspace){
 const role=workspace.profile.viewer.role;
 const permissions=isOrgRole(role)?resolvePermissions(role,workspace.extraPermissions):new Set<string>();
 const modules=workspace.profile.organization.enabledModules;
 const routeAllowed=workspaceRouteEnabled(workspace.profile.organization,'/orders')&&workspaceRoleRouteEnabled(role,'/orders');
 const shippingEnabled=modules.includes('SHIPPING');
 const canAssign=permissions.has('tasks.assign');
 const canOperate=['OWNER','MANAGER'].includes(role)&&permissions.has('orders.write')&&permissions.has('orders.transition');
 return {role,routeAllowed,coreEnabled:modules.includes('CORE'),commerceEnabled:modules.includes('COMMERCE'),shippingEnabled,ordersWrite:permissions.has('orders.write'),ordersTransition:permissions.has('orders.transition'),teamEnabled:modules.includes('TEAM'),canAssign,canOperate,renderOwnerActions:routeAllowed&&shippingEnabled&&canOperate,renderEmployeeActions:routeAllowed&&shippingEnabled&&role==='EMPLOYEE'};
}
