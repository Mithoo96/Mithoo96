import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Workspace} from "../auth/workspace";
import {viewScope} from "./workspace-views";
import {hasModules} from "@/core/tenancy/modules";
import {z} from "zod";
const taskSchema=z.object({id:z.string(),title:z.string(),type:z.string(),status:z.string(),priority:z.string(),assigned_to:z.string().nullable(),due_at:z.string().nullable(),order_id:z.string().nullable()});
export async function getCoreTasks(client:SupabaseClient,workspace:Workspace){const org=viewScope(workspace,["CORE"]);let query=client.from('tasks').select('id,title,type,status,priority,assigned_to,due_at,order_id').eq('organization_id',org).order('created_at',{ascending:false}).limit(100);if(!hasModules(workspace.profile.organization,['COMMERCE','SHIPPING']))query=query.eq('type','GENERIC');const r=await query;if(r.error)throw new Error('Tasks are temporarily unavailable');return z.array(taskSchema).parse(r.data);}
export async function getCoreActivity(client:SupabaseClient,workspace:Workspace){const org=viewScope(workspace,["CORE"]);const r=await client.from('activity_logs').select('id,action,summary,occurred_at,order_id').eq('organization_id',org).order('occurred_at',{ascending:false}).limit(25);if(r.error)throw new Error('Activity is temporarily unavailable');return z.array(z.object({id:z.string(),action:z.string(),summary:z.string(),occurred_at:z.string(),order_id:z.string().nullable()})).parse(r.data);}
export async function getCoreSummary(client:SupabaseClient,workspace:Workspace){const tasks=await getCoreTasks(client,workspace);return {tasks,open:tasks.filter(t=>['OPEN','IN_PROGRESS','BLOCKED','AWAITING_VERIFICATION'].includes(t.status)).length,attention:tasks.filter(t=>t.status==='BLOCKED'||t.due_at&&new Date(t.due_at)<new Date()&&!['COMPLETED','CANCELLED'].includes(t.status)).length,completed:tasks.filter(t=>t.status==='COMPLETED').length};}
