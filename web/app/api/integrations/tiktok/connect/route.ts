import {NextResponse} from 'next/server';
import {tikTokConfig} from '@/server/integrations/tiktok/config';
import {authorizationWorkspace,privateResponse} from '@/server/integrations/tiktok/http';
import {beginAuthorization} from '@/server/integrations/tiktok/authorization';
import {sellerAuthorizationUrl,STATE_COOKIE,STATE_TTL} from '@/server/integrations/tiktok/protocol';
export const runtime='nodejs';
export async function POST(request:Request){
 const config=tikTokConfig();if(!config)return privateResponse(NextResponse.json({error:'TikTok Shop authorization is not configured yet.'},{status:503}));
 const origin=new URL(config.redirectUri).origin;
 if(request.headers.get('origin')!==origin||new URL(request.url).origin!==origin)return privateResponse(NextResponse.json({error:'Authorization request rejected.'},{status:403}));
 try{const {userId,organizationId}=await authorizationWorkspace();const state=await beginAuthorization(userId,organizationId,config);const response=privateResponse(NextResponse.redirect(sellerAuthorizationUrl(config,state),303));response.cookies.set(STATE_COOKIE,state,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:STATE_TTL});return response;}
 catch{return privateResponse(NextResponse.json({error:'Authorization could not be started. Sign in to an authorized workspace and try again.'},{status:403}));}
}
