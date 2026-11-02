import 'server-only';
import {z} from 'zod';
export const TIKTOK_CALLBACK_PATH='/api/integrations/tiktok/callback';
const schema=z.object({appKey:z.string().trim().min(1),appSecret:z.string().min(1),serviceId:z.string().regex(/^[a-zA-Z0-9_-]+$/),market:z.enum(['US','ROW']),redirectUri:z.string().url()});
export function tikTokConfig(){
 const parsed=schema.safeParse({appKey:process.env.TIKTOK_SHOP_APP_KEY,appSecret:process.env.TIKTOK_SHOP_APP_SECRET,serviceId:process.env.TIKTOK_SHOP_SERVICE_ID,market:process.env.TIKTOK_SHOP_MARKET,redirectUri:process.env.TIKTOK_SHOP_REDIRECT_URI});
 if(!parsed.success)return null;
 const url=new URL(parsed.data.redirectUri);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!==TIKTOK_CALLBACK_PATH)return null;
 return parsed.data;
}
export type TikTokConfig=NonNullable<ReturnType<typeof tikTokConfig>>;
