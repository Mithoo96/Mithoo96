"use server";
import {getSessionUserId} from '../auth/session';
import {provisionWorkspace} from '../services/onboarding';
import {toActionError} from './result';
export async function createWorkspace(input:unknown){try{return {ok:true as const,organizationId:await provisionWorkspace(await getSessionUserId(),input)};}catch(error){return toActionError(error);}}
