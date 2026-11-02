import {hasModules,type ModuleAccess,type OrganizationModule} from '@/core/tenancy/modules';
import {commerceProviders} from '@/integrations/commerce/catalog';
export const INTEGRATION_CATEGORIES={sales:'Sales Channels',payments:'Payments',shipping:'Shipping & Fulfillment',communication:'Communication',marketing:'Marketing',business:'Business Tools',ai:'AI & Automation'} as const;
export type IntegrationCategory=keyof typeof INTEGRATION_CATEGORIES;
export type IntegrationAction='connect'|'manage'|'reconnect'|'view-details';
export type LogoId='shopify'|'tiktok'|'woocommerce'|'amazon'|'ebay'|'stripe'|'square'|'paypal'|'usps'|'ups'|'fedex'|'gmail'|'whatsapp'|'meta'|'instagram'|'calendar'|'drive'|'openai'|'claude';
export interface IntegrationProvider{
 id:string;name:string;category:IntegrationCategory;logo:LogoId;description:string;
 requiredCapabilities:readonly OrganizationModule[];visibleForAny:readonly OrganizationModule[];
 implementation:{phase:'planned'|'adapter-boundary'|'ready';liveImplemented:boolean;connectionInfrastructure:boolean};
 supportedActions:readonly IntegrationAction[];
 routes?:Partial<Record<'connect'|'manage'|'reconnect',string>>;
 aliases?:readonly string[];
}
const planned={phase:'planned',liveImplemented:false,connectionInfrastructure:false} as const;
const provider=(p:Omit<IntegrationProvider,'implementation'|'supportedActions'>&Partial<Pick<IntegrationProvider,'implementation'|'supportedActions'>>):IntegrationProvider=>({implementation:planned,supportedActions:['view-details'],...p});
export const integrationCatalog:readonly IntegrationProvider[]=[
 provider({id:'SHOPIFY',name:'Shopify',category:'sales',logo:'shopify',description:'Bring store orders into one fulfillment workflow.',requiredCapabilities:['CORE','COMMERCE','SHOPIFY'],visibleForAny:['COMMERCE'],implementation:{phase:'adapter-boundary',liveImplemented:commerceProviders.SHOPIFY.liveImplemented,connectionInfrastructure:true}}),
 provider({id:'TIKTOK_SHOP',name:'TikTok Shop',category:'sales',logo:'tiktok',description:'Keep shop orders and shipping deadlines together.',requiredCapabilities:['CORE','COMMERCE','TIKTOK_SHOP'],visibleForAny:['COMMERCE'],aliases:['TIKTOK_SHOP_MOCK'],implementation:{phase:'adapter-boundary',liveImplemented:commerceProviders.TIKTOK_SHOP.liveImplemented,connectionInfrastructure:true}}),
 provider({id:'WOOCOMMERCE',name:'WooCommerce',category:'sales',logo:'woocommerce',description:'Bring WooCommerce orders into your operations.',requiredCapabilities:['CORE','COMMERCE'],visibleForAny:['COMMERCE']}),
 provider({id:'AMAZON',name:'Amazon',category:'sales',logo:'amazon',description:'Manage marketplace orders in one workspace.',requiredCapabilities:['CORE','COMMERCE'],visibleForAny:['COMMERCE']}),
 provider({id:'EBAY',name:'eBay',category:'sales',logo:'ebay',description:'Bring marketplace sales into your order queue.',requiredCapabilities:['CORE','COMMERCE'],visibleForAny:['COMMERCE']}),
 provider({id:'STRIPE',name:'Stripe',category:'payments',logo:'stripe',description:'Keep payment context close to business activity.',requiredCapabilities:['CORE'],visibleForAny:['COMMERCE','CRM']}),
 provider({id:'SQUARE',name:'Square',category:'payments',logo:'square',description:'Connect point-of-sale and payment activity.',requiredCapabilities:['CORE'],visibleForAny:['COMMERCE','CRM']}),
 provider({id:'PAYPAL',name:'PayPal',category:'payments',logo:'paypal',description:'Connect payment and transaction context.',requiredCapabilities:['CORE'],visibleForAny:['COMMERCE','CRM']}),
 provider({id:'USPS',name:'USPS',category:'shipping',logo:'usps',description:'Bring postal tracking into shipment verification.',requiredCapabilities:['CORE','COMMERCE','SHIPPING'],visibleForAny:['COMMERCE','SHIPPING'],implementation:{phase:'adapter-boundary',liveImplemented:false,connectionInfrastructure:false}}),
 provider({id:'UPS',name:'UPS',category:'shipping',logo:'ups',description:'Follow package tracking and carrier milestones.',requiredCapabilities:['CORE','COMMERCE','SHIPPING'],visibleForAny:['COMMERCE','SHIPPING']}),
 provider({id:'FEDEX',name:'FedEx',category:'shipping',logo:'fedex',description:'Bring delivery tracking into your shipping context.',requiredCapabilities:['CORE','COMMERCE','SHIPPING'],visibleForAny:['COMMERCE','SHIPPING']}),
 provider({id:'GMAIL',name:'Gmail',category:'communication',logo:'gmail',description:'Keep business email close to your work.',requiredCapabilities:['CORE'],visibleForAny:['CORE']}),
 provider({id:'WHATSAPP_BUSINESS',name:'WhatsApp Business',category:'communication',logo:'whatsapp',description:'Bring business conversations into your workspace.',requiredCapabilities:['CORE'],visibleForAny:['CORE']}),
 provider({id:'META',name:'Meta',category:'marketing',logo:'meta',description:'Connect campaign and audience activity.',requiredCapabilities:['CORE','MARKETING'],visibleForAny:['COMMERCE','CRM','MARKETING']}),
 provider({id:'INSTAGRAM',name:'Instagram',category:'marketing',logo:'instagram',description:'Keep brand activity close to your business.',requiredCapabilities:['CORE','MARKETING'],visibleForAny:['COMMERCE','CRM','MARKETING']}),
 provider({id:'TIKTOK',name:'TikTok',category:'marketing',logo:'tiktok',description:'Connect marketing activity separately from Shop.',requiredCapabilities:['CORE','MARKETING'],visibleForAny:['COMMERCE','CRM','MARKETING']}),
 provider({id:'GOOGLE_CALENDAR',name:'Google Calendar',category:'business',logo:'calendar',description:'Keep appointments and work schedules aligned.',requiredCapabilities:['CORE'],visibleForAny:['CORE']}),
 provider({id:'GOOGLE_DRIVE',name:'Google Drive',category:'business',logo:'drive',description:'Keep business files connected to your work.',requiredCapabilities:['CORE'],visibleForAny:['CORE']}),
 provider({id:'OPENAI',name:'OpenAI',category:'ai',logo:'openai',description:'Prepare AI assistance for approved business work.',requiredCapabilities:['CORE','AI'],visibleForAny:['CORE']}),
 provider({id:'ANTHROPIC',name:'Anthropic / Claude',category:'ai',logo:'claude',description:'Prepare Claude assistance for approved workflows.',requiredCapabilities:['CORE','AI'],visibleForAny:['CORE']}),
];
export function visibleProviders(access:ModuleAccess){return integrationCatalog.filter(p=>p.visibleForAny.some(cap=>hasModules(access,[cap])));}
export function prioritizedCategories(access:ModuleAccess):IntegrationCategory[]{return hasModules(access,['COMMERCE'])?['sales','payments','shipping','communication','marketing','business','ai']:['communication','business','payments','marketing','ai','sales','shipping'];}
