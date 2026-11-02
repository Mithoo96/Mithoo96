import 'server-only';
import {z} from 'zod';
import {DomainError} from '@/core/errors';
import {organizationModules,requireModules} from '@/core/tenancy/modules';
import {runAsMember,requirePermission,type UserServiceContext} from '@/server/context';
import {logActivity} from '@/server/services/activity';
import {putPrivateSecret,takePrivateState} from './vault';
import {newOAuthState,stateName,STATE_TTL,type SellerAuthorization} from './protocol';
import type {TikTokConfig} from './config';
const stateSchema=z.object({userId:z.string().uuid(),organizationId:z.string().uuid(),expiresAt:z.number(),issuedAt:z.number(),redirectUri:z.string(),appKey:z.string()});
export type AuthorizationState=z.infer<typeof stateSchema>;
export async function requireTikTokOwner(ctx:UserServiceContext){requirePermission(ctx,'integrations.manage');const org=await ctx.db.one<{metadata:Record<string,unknown>}>('select metadata from public.organizations where id=$1',[ctx.organizationId]);requireModules(organizationModules(org.metadata),['CORE','COMMERCE','INTEGRATIONS','TIKTOK_SHOP']);}
export async function beginAuthorization(userId:string,organizationId:string,config:TikTokConfig){return runAsMember(userId,organizationId,async ctx=>{
 await requireTikTokOwner(ctx);const state=newOAuthState();const now=Date.now();await putPrivateSecret(ctx.db,stateName(state),JSON.stringify({userId,organizationId,issuedAt:now,expiresAt:now+STATE_TTL*1000,redirectUri:config.redirectUri,appKey:config.appKey}));return state;
 });}
/** Atomic removal commits before the network call: concurrent/replayed callbacks cannot exchange or attach credentials twice. */
export async function consumeAuthorization(userId:string,organizationId:string,state:string,config:TikTokConfig):Promise<AuthorizationState>{return runAsMember(userId,organizationId,async ctx=>{
 await requireTikTokOwner(ctx);const raw=await takePrivateState(ctx.db,stateName(state));const result=stateSchema.safeParse(raw?JSON.parse(raw):null);
 if(!result.success||result.data.userId!==userId||result.data.organizationId!==organizationId||result.data.expiresAt<Date.now()||result.data.appKey!==config.appKey||result.data.redirectUri!==config.redirectUri)throw new DomainError('FORBIDDEN','Authorization state is invalid or expired');return result.data;
 });}
export async function completeAuthorization(state:AuthorizationState,authorization:SellerAuthorization){return runAsMember(state.userId,state.organizationId,async ctx=>{
 // Re-check membership/capabilities after the external request. Vault+connection+audit commit together.
 await requireTikTokOwner(ctx);
 await ctx.db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`TIKTOK_AUTH_${ctx.organizationId}`]);
 for(const shop of authorization.shops){
  const existing=await ctx.db.maybeOne<{id:string;metadata:Record<string,unknown>}>('select id,metadata from public.integration_connections where organization_id=$1 and provider=\'TIKTOK_SHOP\' and is_mock=false and external_account_id=$2 for update',[ctx.organizationId,shop.id]);
  if(existing&&Number(existing.metadata.oauth_started_at)>state.issuedAt)throw new DomainError('CONFLICT','A newer authorization already completed');
  const secretId=await putPrivateSecret(ctx.db,`MBOS_TIKTOK_TOKEN_${ctx.organizationId}_${shop.id}`,JSON.stringify({organizationId:ctx.organizationId,shop,appKey:state.appKey,tokens:authorization.tokens}));
  const ref='VAULT_'+secretId.replaceAll('-','').toUpperCase();
  const metadata={connection_verified_at:new Date().toISOString(),authorization_expires_at:new Date(authorization.tokens.access_token_expire_in*1000).toISOString(),oauth_started_at:state.issuedAt,authorization_only:true};
  const conn=existing?await ctx.db.one<{id:string}>("update public.integration_connections set status='ACTIVE',credentials_ref=$3,last_error=null,metadata=metadata||$4::jsonb where id=$1 and organization_id=$2 returning id",[existing.id,ctx.organizationId,ref,JSON.stringify(metadata)]):await ctx.db.one<{id:string}>("insert into public.integration_connections (organization_id,provider,kind,display_name,status,is_mock,external_account_id,credentials_ref,metadata,created_by) values ($1,'TIKTOK_SHOP','COMMERCE_CHANNEL','TikTok Shop','ACTIVE',false,$2,$3,$4,$5) returning id",[ctx.organizationId,shop.id,ref,JSON.stringify(metadata),ctx.actor.userId]);
  await logActivity(ctx,{action:'integration.authorized',resourceType:'integration_connection',resourceId:conn.id,summary:'TikTok Shop seller authorization verified. Order synchronization is not enabled.',metadata:{provider:'TIKTOK_SHOP'}});
 }
 });}
