import {NextRequest,NextResponse} from 'next/server';
import {tikTokConfig} from '@/server/integrations/tiktok/config';
import {authorizationWorkspace,privateResponse} from '@/server/integrations/tiktok/http';
import {consumeAuthorization,completeAuthorization} from '@/server/integrations/tiktok/authorization';
import {matchingState,exchangeSellerAuthorization,STATE_COOKIE} from '@/server/integrations/tiktok/protocol';
export const runtime='nodejs';
export const maxDuration=60;
function finish(response:NextResponse){response.cookies.set(STATE_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});return privateResponse(response);}
const invalid=()=>finish(NextResponse.json({error:'Authorization could not be completed. Start again from Integrations.'},{status:400}));
export async function GET(request:NextRequest){
 const params=request.nextUrl.searchParams;
 if(['state','code','error','app_key'].some(k=>params.getAll(k).length>1)||!matchingState(params.get('state'),request.cookies.get(STATE_COOKIE)?.value))return invalid();
 const config=tikTokConfig();if(!config)return finish(NextResponse.json({error:'TikTok Shop authorization is not configured yet.'},{status:503}));
 if(request.nextUrl.origin!==new URL(config.redirectUri).origin||params.has('app_key')&&params.get('app_key')!==config.appKey)return invalid();
 try{
  const {userId,organizationId}=await authorizationWorkspace();const state=await consumeAuthorization(userId,organizationId,params.get('state')!,config);
  if(params.has('error'))return finish(NextResponse.redirect(new URL('/integrations?tiktok=denied',config.redirectUri),303));
  const code=params.get('code');if(!code||code==='null'||code.length>4096||/[\r\n]/.test(code))return invalid();
  const authorization=await exchangeSellerAuthorization(config,code);await completeAuthorization(state,authorization);
  return finish(NextResponse.redirect(new URL('/integrations?tiktok=authorized',config.redirectUri),303));
 }catch{return invalid();}
}
