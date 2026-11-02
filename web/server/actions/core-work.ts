"use server";
import {z} from 'zod';
import {memberAction} from './result';
import {getWorkspace} from '../auth/workspace';
import {createManualTask,startTask,completeTask} from '../services/tasks';
import {loadTask} from '../services/tasks-core';
import {DomainError} from '@/core/errors';
export async function coreTaskAction(raw:unknown){const input=z.discriminatedUnion('action',[z.object({action:z.literal('create'),title:z.string().trim().min(3).max(200)}).strict(),z.object({action:z.enum(['start','complete']),taskId:z.string().uuid()}).strict()]).parse(raw);const{workspace}=await getWorkspace();return memberAction(workspace.profile.organization.id,async ctx=>{if(input.action==='create')return createManualTask(ctx,{type:'GENERIC',title:input.title,assignedTo:ctx.actor.userId});const task=await loadTask(ctx,input.taskId);if(task.type!=='GENERIC')throw new DomainError('FORBIDDEN','Use the guided operational workflow for this task');if(input.action==='start'){await startTask(ctx,task.id);return {message:'Task started'};}return completeTask(ctx,task.id);},['CORE']);}
