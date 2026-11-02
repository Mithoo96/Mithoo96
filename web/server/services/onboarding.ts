import "server-only";
import {businessConfiguration} from '@/core/tenancy/business-models';
import {withSystemTransaction} from '../db/client';
export async function provisionWorkspace(userId:string,raw:unknown){const {input,metadata}=businessConfiguration(raw);return withSystemTransaction('onboarding:workspace',async db=>{
 await db.query('select pg_advisory_xact_lock(hashtext($1))',[`onboarding:${userId}`]);
 const existing=await db.maybeOne<{organization_id:string}>("select m.organization_id from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=$1 and m.status='ACTIVE' and o.status='ACTIVE' order by m.created_at limit 1",[userId]);
 if(existing)return existing.organization_id;
 const id=crypto.randomUUID();const slug=`workspace-${id}`;
 await db.query('insert into public.organizations(id,name,slug,timezone,created_by,metadata) values ($1,$2,$3,$4,$5,$6)',[id,input.name,slug,input.timezone,userId,JSON.stringify(metadata)]);
 await db.query("insert into public.organization_members(organization_id,user_id,role,status,title) values ($1,$2,'OWNER','ACTIVE','Owner')",[id,userId]);
 await db.query("insert into public.activity_logs(organization_id,actor_type,actor_id,action,resource_type,resource_id,summary,metadata) values ($1,'USER',$2,'workspace.created','organization',$1,'Business workspace created',$3)",[id,userId,JSON.stringify({businessModel:input.businessModel})]);
 return id;
 });}
