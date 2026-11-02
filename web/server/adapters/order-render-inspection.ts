import 'server-only';
import type {Workspace} from '../auth/workspace';
import type {OrderRenderInspection} from '@/core/orders/render-inspection';
import {orderActionAccess} from './order-action-access';
export function orderRenderInspection(workspace:Workspace,order:{status:string}|null,eligibleEmployeeCount:number|null=null):OrderRenderInspection{
 return {revision:'order-render-inspection-1',deployment:/^dpl_[A-Za-z0-9]+$/.test(process.env.VERCEL_DEPLOYMENT_ID??'')?process.env.VERCEL_DEPLOYMENT_ID!:'UNAVAILABLE',commit:/^[a-f0-9]{40}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA??'')?process.env.VERCEL_GIT_COMMIT_SHA!:'UNAVAILABLE',authenticated:true,eligibleEmployeeCount,...orderActionAccess(workspace),orderVisible:order!==null,orderMatchesActiveOrganization:order!==null,orderState:order?.status??null};
}
