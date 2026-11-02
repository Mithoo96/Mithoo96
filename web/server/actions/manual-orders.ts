"use server";
import {memberAction,toActionError} from './result';import {getWorkspace} from '../auth/workspace';import {createManualOrder} from '../services/manual-orders';
export async function createManualOrderAction(raw:unknown){try{const{workspace}=await getWorkspace();return memberAction(workspace.profile.organization.id,ctx=>createManualOrder(ctx,raw),['CORE','COMMERCE','SHIPPING']);}catch(error){return toActionError(error);}}
