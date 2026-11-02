import {siShopify,siTiktok,siWoocommerce,siEbay,siStripe,siSquare,siPaypal,siUsps,siUps,siFedex,siGmail,siWhatsapp,siMeta,siInstagram,siGooglecalendar,siGoogledrive,siClaude} from 'simple-icons';
import {faAmazon,faOpenai} from '@fortawesome/free-brands-svg-icons';
import type {LogoId} from './catalog';
export interface ProviderLogoData{viewBox:string;paths:{d:string;fill:string}[]}
const simple={shopify:siShopify,tiktok:siTiktok,woocommerce:siWoocommerce,ebay:siEbay,stripe:siStripe,square:siSquare,paypal:siPaypal,usps:siUsps,ups:siUps,fedex:siFedex,gmail:siGmail,whatsapp:siWhatsapp,meta:siMeta,instagram:siInstagram,calendar:siGooglecalendar,drive:siGoogledrive,claude:siClaude};
/** Only these selected path primitives cross the server/client boundary; no remote logo requests or SVG HTML. */
export function providerLogo(id:LogoId):ProviderLogoData{if(id==='amazon'||id==='openai'){const [width,height,,,data]=(id==='amazon'?faAmazon:faOpenai).icon;return {viewBox:`0 0 ${width} ${height}`,paths:(Array.isArray(data)?data:[data]).map(d=>({d,fill:'#111111'}))};}const icon=simple[id];return {viewBox:'0 0 24 24',paths:[{d:icon.path,fill:`#${icon.hex}`} ]};}
