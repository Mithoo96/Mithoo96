import 'server-only';
import {createHmac,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {get} from 'node:https';
import {z} from 'zod';
import {DomainError} from '@/core/errors';
import type {TikTokConfig} from './config';
export const STATE_COOKIE='__Host-mithoo_tiktok_oauth';
export const STATE_TTL=600;
export const newOAuthState=()=>randomBytes(32).toString('base64url');
export const stateName=(state:string)=>'MBOS_TIKTOK_STATE_'+createHash('sha256').update(state).digest('hex');
export function matchingState(state:string|null,cookie:string|undefined){return !!state&&!!cookie&&/^[A-Za-z0-9_-]{43}$/.test(state)&&/^[A-Za-z0-9_-]{43}$/.test(cookie)&&timingSafeEqual(Buffer.from(state),Buffer.from(cookie));}
export function sellerAuthorizationUrl(config:TikTokConfig,state:string){const url=new URL(config.market==='US'?'https://services.us.tiktokshop.com/open/authorize':'https://services.tiktokshop.com/open/authorize');url.searchParams.set('service_id',config.serviceId);url.searchParams.set('state',state);return url;}
export function signShopRequest(url:URL,secret:string){const pairs=[...url.searchParams].filter(([k])=>k!=='sign'&&k!=='access_token').sort(([a],[b])=>a.localeCompare(b));const text=url.pathname+pairs.map(([k,v])=>k+v).join('');return createHmac('sha256',secret).update(secret+text+secret).digest('hex');}
const fail=()=>new DomainError('INTEGRATION_ERROR','TikTok Shop authorization could not be verified. Start authorization again.');
/** TikTok requires GET with app_secret in the token URL. Native HTTPS avoids Next fetch caching/tracing; never log URLs, bodies or transport errors. No redirects or retries. */
export function tikTokJson(url:URL,headers:Record<string,string>={}):Promise<unknown>{return new Promise((resolve,reject)=>{
 const request=get(url,{headers:{Accept:'application/json',...headers}},response=>{
  if(response.statusCode!==200){response.resume();reject(fail());return;}
  let size=0;const chunks:Buffer[]=[];
  response.on('data',(part:Buffer)=>{size+=part.length;if(size>512_000){response.destroy();reject(fail());}else chunks.push(part);});
  response.on('error',()=>reject(fail()));response.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(fail());}});
 });
 request.setTimeout(15_000,()=>{request.destroy();reject(fail());});request.on('error',()=>reject(fail()));
});}
const tokens=z.object({access_token:z.string().min(1),refresh_token:z.string().min(1),access_token_expire_in:z.number().int().positive(),refresh_token_expire_in:z.number().int().positive(),open_id:z.string().min(1),user_type:z.literal(0),granted_scopes:z.array(z.string()).default([])});
const shops=z.array(z.object({id:z.string().min(1),cipher:z.string().min(1),region:z.string().min(1)})).min(1).max(100);
export type SellerAuthorization={tokens:z.infer<typeof tokens>;shops:z.infer<typeof shops>};
export async function exchangeSellerAuthorization(config:TikTokConfig,code:string,requestJson=tikTokJson):Promise<SellerAuthorization>{
 try{
  const tokenUrl=new URL('https://auth.tiktok-shops.com/api/v2/token/get');for(const[k,v]of Object.entries({app_key:config.appKey,app_secret:config.appSecret,auth_code:code,grant_type:'authorized_code'}))tokenUrl.searchParams.set(k,v);
  const tokenResponse=z.object({code:z.literal(0),data:tokens}).parse(await requestJson(tokenUrl));const now=Math.floor(Date.now()/1000);
  if(tokenResponse.data.access_token_expire_in<=now+60||tokenResponse.data.refresh_token_expire_in<=now+60)throw fail();
  const shopUrl=new URL('https://open-api.tiktokglobalshop.com/authorization/202309/shops');shopUrl.searchParams.set('app_key',config.appKey);shopUrl.searchParams.set('timestamp',String(now));shopUrl.searchParams.set('sign',signShopRequest(shopUrl,config.appSecret));
  const shopResponse=z.object({code:z.literal(0),data:z.object({shops})}).parse(await requestJson(shopUrl,{'x-tts-access-token':tokenResponse.data.access_token,'content-type':'application/json'}));
  if(new Set(shopResponse.data.shops.map(s=>s.id)).size!==shopResponse.data.shops.length||config.market==='US'&&shopResponse.data.shops.some(s=>s.region!=='US'))throw fail();
  return {tokens:tokenResponse.data,shops:shopResponse.data.shops};
 }catch{throw fail();}
}
